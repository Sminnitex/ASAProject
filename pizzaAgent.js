import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU1ZGZhNTdiNzMyIiwibmFtZSI6Ik11bmljaCBNYWZpYSIsImlhdCI6MTcxMjY3MzA2NH0.yMnSFSWZjwPl2CVDC-FZqOZqC0wlEcF53W3VMazu4Co'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) );
    const dy = Math.abs( Math.round(y1) - Math.round(y2) );
    return dx + dy;
}

function select_closest_tile (tiles){
    let nearest_distance = Number.MAX_VALUE;
    let closest_tile;

    for (const tile of tiles){ 
        const distance_tile = distance(me, tile);

        if (distance_tile < nearest_distance){
             nearest_distance = distance_tile;
             closest_tile = tile;
        }
    }
    return closest_tile;
}

function tileIsFree(x, y){
    for (const a of agents.entries()){
        if (x == a['x'] && y == a['y']){
            return false;
        }
    }
    return true;
}


/**
* Sensing
**/

const me = {};
client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id;
    me.name = name;
    me.x = x;
    me.y = y;
    me.score = score;

} )

const parcels = new Map();
client.onParcelsSensing( async ( perceived_parcels ) => {
    for (const p of perceived_parcels) {
		// p is {id, x, y, carriedBy, reward}
        parcels.set(p.id, p);
    }
} )

/**
 * @type {Map<x,Map<y,{x,y,delivery}>}
 */
const tile = new Map();
const deliveryTile = new Set();

client.onTile( ( x, y, delivery ) => {
    if (! tile.has(x)){
		tile.set(x, new Map);
	}      
    tile.get(x).set(y, {x, y, delivery});
    if (delivery){
        deliveryTile.add({x, y});
    }
} );

const agents = new Map();
client.onAgentsSensing ((perceived_agents) =>{
    for (const a of perceived_agents){
        agents.set(a.id, a);
    }
})


/**
* BDI Control Loop
**/

function agentLoop() {
    
    /**
     * Generate Options
     */

	const options = [];

	for (const [p_id, parcel] of parcels.entries()){
        if (parcel.reward <= 1){
            console.log('Deleting parcel', parcel, 'because the timer ran out.');
            parcels.delete(p_id);
            continue;
        }
		else if (parcel.carriedBy){
            if (parcel.carriedBy == me.id){
                if (deliveryTile.size > 0){
                    options.push({
                        desire: 'deliver',
                        args: [select_closest_tile(deliveryTile)]
                    })
                }
                continue;
            }
            else {
                console.log('Deleting parcel', parcel, 'because someone took it.');
                parcels.delete(p_id)
                continue;
            }
		}
        
		options.push({  // Generate new desire to pick up the parcel
			desire: 'go_pick_up',
			args: [parcel]
		});
	}
    
    /**
     * Select best intention
     */
	let best_option;
	let nearest_distance = Number.MAX_VALUE;

	for (const option of options){
		if (option.desire == 'go_pick_up'){
			let parcel = option.args[0];
		    const distance_to_option = distance(me, parcel);

		    if (distance_to_option < nearest_distance){
			// choose closest parcel as best option
			    best_option = option;
			    nearest_distance = distance_to_option;
		}
		} 
        else if (option.desire == 'deliver'){
            const distance_to_option = distance(me, option.args[0]);
            if (distance_to_option < nearest_distance){
                best_option = option;
                nearest_distance = distance_to_option;
            }
        }
		
	}


    /**
     * Revise/queue intention 
     */
	if (best_option){
		myAgent.queue(best_option.desire, best_option.args);  // simply queue it - no logic yet!
	}
}
client.onParcelsSensing(agentLoop);  // execute agent loop when sensing parcels TODO: is this the best time?


/**
 * Intention revision / execution loop
 */
class Agent {

    intention_queue = new Array();

    async intentionLoop ( ) {
        while ( true ) {
            const intention = this.intention_queue.shift();  // remove first intention from queue
        
            if (intention){
				// Try to achieve the intention
				let result = await intention.achieve();

			}
            await new Promise( res => setImmediate(res) );
        }
    }

    async queue ( desire, ...args ) {
		// Add new intention to queue
        const current = new Intention( desire, ...args )
        this.intention_queue.push( current );
    }

    async stop ( ) {
		// Stop queued intentions
        console.log( 'stop agent queued intentions');
        for (const intention of this.intention_queue) {
            intention.stop();
        }
    }

}

const myAgent = new Agent();
myAgent.intentionLoop();


/**
 * Intention
 */
class Intention extends Promise {
	// Private variables
    #current_plan;
	#desire;
    #args;
    #resolve;
    #reject;
	#started

	// Constructor
	constructor ( desire, ...args ) {
        var resolve, reject;
        super( async (res, rej) => {
            resolve = res; reject = rej;
        } )
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
		this.#started = false;
    }

	// Functions
    stop () {
        console.log( 'stop intention and current plan');
        this.#current_plan.stop();
    }

    async achieve () {
		if (this.#started){
			return this;  // if the intention will already be achieved
		}
		this.#started = true;
		console.log("Try to select a plan")

		/**
		 * Plan selection
		 */
		// TODO: how to select best plan?
		let best_plan;
		let best_plan_score = Number.MIN_VALUE;

		for (const plan of plans){
			if (plan.isApplicableTo(this.#desire)){
				this.#current_plan = plan;
				console.log('Achieving desire ', this.#desire, ...this.#args, ' with plan ', plan);
				try {
					const plan_res = await plan.execute(...this.#args);
                    if (plan_res){
                        console.log('Plan ',plan, ' successfully achieved with result ', plan_res);
					    this.#resolve(plan_res);
                        return true;
                    }
                    else {
                        console.log('Plan ', plan, ' failed');
                        continue;
                    }
					
				} catch (error){
					console.log('Plan ', plan, ' failed');
                    continue;
				}
			}
		}
        return false;

    }

}


/**
 * Plan library
 */
const plans = [];

class Plan {
	#sub_intentions = [];

    stop () {
        console.log( 'stop plan and all sub intentions');
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }

    async subIntention ( desire, ...args ) {
        const sub_intention = new Intention( desire, ...args );
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

class Delivery extends Plan{
    isApplicableTo ( desire ){
        return desire == 'deliver';
    }

    async execute (...args){
        let array_args = args.shift().shift();
        let x = array_args['x'];
		let y = array_args['y'];
    
        let res = await this.subIntention('go_to', x, y);
        if (!res){
            return false;
        }

        let putdown_result = await client.putdown();

        if(putdown_result){
            // remove all parcels that were put down from parcel map (otherwise, it will get stuck on delivery tile)
            for (const [p_id, parcel] of parcels.entries()){
                if (parcel.carriedBy == me.id){
                    parcels.delete(p_id)
                }
            }
        }

        return true;
    }
}

class GoPickUp extends Plan{
    isApplicableTo ( desire ){
        return desire == 'go_pick_up';
    }

    async execute ( ...args ){
        let array_args = args.shift().shift();
		let x = array_args['x'];
		let y = array_args['y'];

        let res = await this.subIntention('go_to', x, y);
        if (!res){
            return false;
        }

        await client.pickup();

        let parcel_id = array_args['id'];
        console.log(parcels.get(parcel_id).carriedBy);

        return true;
    }
}

class BlindMove extends Plan {
    isApplicableTo ( desire ) {
		return desire == 'go_to';
    }

    async execute ( x, y ) {
		while ( me.x != x || me.y != y ) {
            let status_x = false;
            let status_y = false;

            if ( x > me.x ){
				status_x = await client.move('right');
			}
            else if ( x < me.x ){
				status_x = await client.move('left');
			}
                

            if (status_x) {
                me.x = status_x.xstatus_y;
                me.y = status_x.y;
            }

            if ( y > me.y ){
				status_y = await client.move('up');
			}
            else if ( y < me.y ){
				status_y = await client.move('down');
			}
                

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }
            
            if ( ! status_x && ! status_y) {
                console.log('stuck');
                return false;
            } else if ( me.x == x && me.y == y ) {
                console.log('target reached');
                return true;
            }
            
        }

        return true;

    }
}

class RandomMove extends Plan{
    isApplicableTo ( desire ) {
		return desire == 'go_to';
    }

    async execute (){
        try{
            
            if(tile.get(me.x + 1) != undefined && tile.get(me.x + 1).get(me.y) != undefined && tileIsFree(me.x + 1, me.y)){
                await client.move("right");
                return true;
            }
            else if(tile.get(me.x - 1) != undefined && tile.get(me.x - 1).get(me.y) != undefined && tileIsFree(me.x - 1, me.y)){
                await client.move("left");
                return true;
            }
            else if(tile.get(me.x) != undefined && tile.get(me.x).get(me.y + 1) != undefined && tileIsFree(me.x, me.y + 1)){
                await client.move("up");
                return true;
            }
            else if(tile.get(me.x) != undefined && tile.get(me.x).get(me.y - 1) != undefined && tileIsFree(me.x, me.y - 1)){
                await client.move("down");
                return true;
            }
            else {
                console.log('Stuck again')
                return false;
                //throw 'stuck again';
            }
        }
        catch (error){
            console.log('Error', error);
            return false;
        }
    }
}

plans.push(new Delivery() )
plans.push( new GoPickUp() )
plans.push( new BlindMove() )
//plans.push( new RandomMove() )