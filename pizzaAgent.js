import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { PddlDomain, PddlAction, PddlProblem, PddlExecutor, onlineSolver, Beliefset } from "@unitn-asa/pddl-client";
import fs from 'fs';

const client = new DeliverooApi(
    'http://localhost:8080/',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2Njk1ZDM5ZGFjIiwibmFtZSI6Ik11bmljaE1hZmlhXzEiLCJpYXQiOjE3MTc0MTY1MDh9.4bNvXhzn2OQpOcVVc2M_ypwvajh9g5MOalux23eumLA'
)

function readFile ( path ) {   
    return new Promise( (res, rej) => {
        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })
}

//PDDL
var start_char = "t";
var separator = "_";
let domain = await readFile('./domain-deliveroo.pddl' );


function generateTileInit(tileMap) {
    let initStr = '';

    for (let [x, col] of tileMap.entries()) {
        for (let [y, tile] of col.entries()) {
            let currentTile = `${start_char}${x}${separator}${y}`;
            
            // Right relationship
            if (tileMap.has(x + 1) && tileMap.get(x + 1).has(y)) {
                let rightTile = `${start_char}${x + 1}${separator}${y}`;
                initStr += `(right ${currentTile} ${rightTile}) `;
                initStr += `(left ${rightTile} ${currentTile}) `;
            }

            // Up relationship
            if (tileMap.has(x) && tileMap.get(x).has(y + 1)) {
                let upTile = `${start_char}${x}${separator}${y + 1}`;
                initStr += `(down ${upTile} ${currentTile}) `;
                initStr += `(up ${currentTile} ${upTile}) `;
            }
        }
    }

    return initStr.trim();
}

function RemoveInvalidObjects(beliefSet) {
    const invalidCharacters = ['(', ')'];
    beliefSet.objects.forEach(obj => {
      if (invalidCharacters.some(char => obj.includes(char))) {
        beliefSet.removeObject(obj);
      } 
    });
  }

async function createPddlProblem(x, y, onMsg){
    const myBeliefset = new Beliefset();
    myBeliefset.declare( 'me ' + me.name );

    if (onMsg){
        myBeliefset.declare( 'at ' + me.name + ' ' + start_char + Math.round(me.x) +  separator + Math.round(me.y));

        let init = generateTileInit(tile);
        myBeliefset.declare(init.substring(1, init.length - 1));
        RemoveInvalidObjects(myBeliefset);

        var pddlProblem = new PddlProblem(
            'deliveroo-can_you_go',
            myBeliefset.objects.at(0) + " - agent\n" + myBeliefset.objects.slice(1).join(" ") + " - tile\n" + "p1" + " - parcel",
            myBeliefset.toPddlString(),
            'at ' + me.name + ' ' + start_char + x + separator + y
            )

    } else if(myAgent.intention_queue[0]?.get_desire() === 'move'){
        myBeliefset.declare( 'at ' + me.name + ' ' + start_char + me.x +  separator + me.y);
        let init = generateTileInit(tile);
        myBeliefset.declare(init.substring(1, init.length - 1));
        RemoveInvalidObjects(myBeliefset);

        var pddlProblem = new PddlProblem(
        'deliveroo-move',
        myBeliefset.objects.at(0) + " - agent\n" + myBeliefset.objects.slice(1).join(" ") + " - tile\n" + "p11 - parcel",
        myBeliefset.toPddlString(),
        'at ' + me.name + ' ' + start_char + x  + separator + y 
        )
    } else if (myAgent.intention_queue[0]?.get_desire() === 'go_to'){
        myBeliefset.declare( 'at ' + me.name + ' ' + start_char + me.x +  separator + me.y);

        let init = generateTileInit(tile);
        myBeliefset.declare(init.substring(1, init.length - 1));
        RemoveInvalidObjects(myBeliefset);

        var pddlProblem = new PddlProblem(
            'deliveroo-go_to',
            myBeliefset.objects.at(0) + " - agent\n" + myBeliefset.objects.slice(1).join(" ") + " - tile\n" + "p1" + " - parcel",
            myBeliefset.toPddlString(),
            'at ' + start_char + x + separator + y
            )
    }
    
    let problem = pddlProblem.toPddlString();
    var plan = await onlineSolver(domain, problem);
    return plan;
    
}


//General purpose functions

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

function select_random_tile(tiles, weights) {
    // Calculate the total sum of the weights and generate a random value between 0 and total weight
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    const randomWeight = Math.random() * totalWeight;

    // Sum each weight, if random weight <= of sum weight return the corresponding tile
    let cumulativeWeight = 0;
    for (let i = 0; i < tiles.length; i++) {
        cumulativeWeight += weights[i];
        if (randomWeight <= cumulativeWeight) {
            return tiles[i];
        }
    }


    // In case of some error, return a random tile
    const randomIndex = Math.floor(Math.random() * tiles.length);
    return tiles[randomIndex];
}


function select_random_tile_from_map(map) {
    let allTiles = [];
    let weights = [];
    let center = (map.size / 2);
    let map_center = {x: center, y: center}

    // Iterate over each entry in the map
    for (const [_, tiles] of map) {
        // Iterate over tiles in the current entry
        for (const [_, tile] of tiles) {
            allTiles.push(tile);

            // Associate weights to have exploration more probable on tiles 
            //closer to the center of the map
            const distance_from_center = distance(tile, map_center);
            const weight = 1 / (distance_from_center + 1);
            weights.push(weight);
        }
    }
    
    // Use the select_random_tile function to select a random tile, with weights
    return select_random_tile(allTiles, weights);
}

function tileIsFree(x, y){
    for (const [_, a] of agents.entries()){
        if (x == a['x'] && y == a['y']){
            return false;
        }
    }
    return true;
}

function getNeighbors(x, y) {
    const neighbors = [];

    if (tile.get(x - 1) != undefined && tile.get(x - 1).get(y) !== undefined && tileIsFree(x, y)) {
        neighbors.push({ x: x - 1, y });
    }
    if (tile.get(x + 1) != undefined && tile.get(x + 1).get(y) !== undefined && tileIsFree(x, y)) {
        neighbors.push({ x: x + 1, y });
    }
    if (tile.get(x) != undefined && tile.get(x).get(y - 1) !== undefined && tileIsFree(x, y)) {
        neighbors.push({ x, y: y - 1 });
    }
    if (tile.get(x) != undefined && tile.get(x).get(y + 1) !== undefined && tileIsFree(x, y)) {
        neighbors.push({ x, y: y + 1 });
    }

    return neighbors;
}

async function moveTowards(x, y) {
    const dx = x - me.x;
    const dy = y - me.y;

    if (dx > 0 && tile.get(me.x + 1) != undefined && tileIsFree(x, y)) {
        await client.move('right');
    } else if (dx < 0 && tile.get(me.x - 1) != undefined && tileIsFree(x, y)) {
        await client.move('left');
    } else if (dy > 0 && tile.get(me.x) != undefined && tile.get(me.x).get(me.y + 1) != undefined && tileIsFree(x, y)) {
        await client.move('up');
    } else if (dy < 0 && tile.get(me.x) != undefined && tile.get(me.x).get(me.y - 1) != undefined && tileIsFree(x, y)) {
        await client.move('down');
    }

    me.x = x;
    me.y = y;
}

async function findPath(start, target) {
    const queue = [{ position: start, path: [] }];
    const visited = new Set();

    while (queue.length > 0) {
        const { position, path } = queue.shift();
        const { x, y } = position;

        if (x === target.x && y === target.y) {
            return path;
        }

        const neighbors = getNeighbors(x, y);
        
        for (const neighbor of neighbors) {
            const { x: nx, y: ny } = neighbor;
            const key = `${nx},${ny}`;

            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ position: neighbor, path: [...path, neighbor] });
            }
        }
    }

    // No path found
    console.log('[FindPath] No path found.');
    return [];
}


function getCurrentCoordinates(){
    if (myAgent.intention_queue.length > 0){
        if(myAgent.intention_queue[0]?.get_desire() === 'move' || myAgent.intention_queue[0]?.get_desire() === 'go_pick_up' || myAgent.intention_queue[0]?.get_desire() === 'deliver'){
            let array_args = myAgent.intention_queue[0]?.get_args()
            array_args = array_args[0][0];
            let x = array_args['x'];
            let y = array_args['y'];  
            return {x, y};
        }
    
        if(myAgent.intention_queue[0]?.get_desire() === 'go_to'){
            let x, y = myAgent.intention_queue[0]?.get_args()
            return {x, y};
        }
    }
    else {
        let x = undefined;
        let y = undefined;
        return {x, y};
    }
}


/**
* Sensing
**/

var AGENTS_OBSERVATION_DISTANCE
var MOVEMENT_DURATION
var PARCEL_DECADING_INTERVAL
var PARCEL_REWARD_AVG
client.onConfig( (config) => {
    AGENTS_OBSERVATION_DISTANCE = config.AGENTS_OBSERVATION_DISTANCE;
    MOVEMENT_DURATION = config.MOVEMENT_DURATION;
    PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL == '1s' ? 1000 : 1000000;
    PARCEL_REWARD_AVG = config.PARCEL_REWARD_AVG;

} );

const me = {};
client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id;
        me.name = name;
        me.x = x;
        me.y = y;
        me.score = score;
} )

const parcels = new Map();
const parcel_timers = new Map();

const blacklisted_parcels = new Map();  // the ones we don't want to pick up anymore

client.onParcelsSensing( async ( perceived_parcels ) => {
    for (const p of perceived_parcels) {
		// p is {id, x, y, carriedBy, reward}
        parcels.set(p.id, p);
        parcel_timers.set(p.id, Date.now());
    }
    for (const [p_id, time] of parcel_timers.entries()){
        if (Date.now() - time >= PARCEL_REWARD_AVG * PARCEL_DECADING_INTERVAL){
            parcels.delete(p_id);
            parcel_timers.delete(p_id);
            blacklisted_parcels.delete(p_id);
        }
    }

    // send parcels to partner to exchange environment information
    if (partnerId !== undefined && parcels.size > 0){
        var parcelString = `Parcels,${parcels.size},`;
        for (const [p_id, p] of parcels.entries()){
            parcelString += `${p.id}-${p.x}-${p.y}-${p.carriedBy}-${p.reward},`
        }
        client.say(partnerId, parcelString);
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

    // send agents to partner to exchange environment information
    if (partnerId !== undefined && agents.size > 0){
        var agentString = `Agents,${agents.size},`;
        for (const [a_id, a] of agents.entries()){
            agentString += `${a.id}-${a.name}-${a.x}-${a.y}-${a.score},`
        }
        client.say(partnerId, agentString);
    }
})

let partnerId;
client.onMsg(async (id, name, msg, reply) => {
    if (partnerId == undefined && name == 'MunichMafia_2'){
        partnerId = id;
        console.log('PARTNER ID', partnerId)
        client.say(partnerId, 'stop broadcasting your id.')
    }
    if (id == partnerId && msg === 'stop broadcasting your id.'){
        broadcast_id = false;
    }
    
    if(name === "MunichMafia_2"){
        let msg_split = msg.split(",");

        // Delivery
        if(msg_split[2] === 'can you go there?'){
            let reach = await createPddlProblem(parseFloat(msg_split[0]), parseFloat(msg_split[1]), true)
            
            if(reach.length > 0){
                reply(String(true));
            }
            else {
                reply(String(false));
            }
        }

        // Pickup
        if (msg_split[2] == 'where are you going?'){
             // Get the current coordinates of the agent
            let { x, y } = getCurrentCoordinates();
            let currentCoordinates = `${x},${y}`;

            if (reply) {
                try {
                    // Send back the current coordinates
                    reply(currentCoordinates);
                } catch (error) {
                    console.error(error);
                }
            }
        }
        
        // Parcels
        if (msg_split[0] === 'Parcels'){
            for (var i=0; i<parseInt(msg_split[1]); i++){
                var parcel = msg_split[2 + i].split("-");
                var id = parcel[0];
                var x = parseInt(parcel[1]);
                var y = parseInt(parcel[2]);
                var carriedBy;
                if (parcel[3] === 'null'){
                    carriedBy = null;
                }
                else {
                    carriedBy = parcel[3];
                }
                var reward = parseInt(parcel[4]);

                parcels.set(id, {id, x, y, carriedBy, reward});
                parcel_timers.set(id, Date.now());
            }
        }

        // Agents
        if (msg_split[0] === 'Agents'){
            for (var i=0; i<parseInt(msg_split[1]); i++){
                var agent = msg_split[2 + i].split("-");
                var id = agent[0];
                var name = agent[1];
                var x = parseFloat(agent[2]);
                var y = parseFloat(agent[3]);
                var score = parseInt(agent[4]);

                agents.set(id, {id, name, x, y, score});
            }
        }
    }
});


let explore = false;
let broadcast_id = true;

/**
* BDI Control Loop
**/

function agentLoop() {
    
    /**
     * Generate Options
     */

	const options = [];

    if (broadcast_id && partnerId === undefined){
        client.shout("HELLO");
    }

	for (const [p_id, parcel] of parcels.entries()){
        if (parcel.reward <= 1){
            parcels.delete(p_id);
            parcel_timers.delete(p_id);
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
                parcels.delete(p_id);
                parcel_timers.delete(p_id);
                continue;
            }
		}
        
		options.push({  // Generate new desire to pick up the parcel
			desire: 'go_pick_up',
			args: [parcel]
		});
	}

    if (explore){
        options.push({
            desire: "move",
            args: [select_random_tile_from_map(tile)]
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
        else if (option.desire == "move"){
          //  const distance_to_option = distance(me, option.args[0]);
           // if (distance_to_option < nearest_distance){
             //   best_option = option;
               // nearest_distance = distance_to_option;
          //  } 
           
           // execute move immediately because we are either stuck or have nothing else to do
           best_option = option;
           nearest_distance = distance(me, option.args[0]);
           break;
           
        }
		
	}


    /**
     * Revise/queue intention 
     */
	if (best_option){
		myAgent.queue(best_option.desire, best_option.args);  // simply queue it - no logic yet!
	}
    else {
        explore = true;
    }
}

client.onParcelsSensing(agentLoop);  // execute agent loop when sensing parcels


/**
 * Intention revision / execution loop
 */
class Agent {

    intention_queue = new Array();

    async intentionLoop ( ) {
        while ( true ) {
            const intention = this.intention_queue.shift();  // remove first intention from queue
        
            if (intention){
                /**
                 * Intention Revision: check if desires are still valid
                 */


                if (intention.get_desire() == 'go_pick_up'){
                    // check if someone (including me) already has the parcel
                    const args = intention.get_args()[0][0];
                    if (parcels.get(args.id) == undefined || parcels.get(args.id).carriedBy != null || blacklisted_parcels.get(args.id) != undefined){
                        //console.log('[Agent] Discarding desire', intention.get_desire(), args, ', no longer valid.');
                        continue; 
                    }
                }
                else if (intention.get_desire() == 'deliver'){
                    // check if I am holding a parcel
                    let carrying_parcels = false;
                    for (const [_, parcel] of parcels.entries()){
                        if (parcel.carriedBy == me.id){
                            carrying_parcels = true;
                        }
                    }
                    if (!carrying_parcels){
                        const args = intention.get_args()[0][0];
                       // console.log('[Agent] Discarding desire', intention.get_desire(), args, ', no longer valid.');
                        continue;
                    } 
                }
                else if(intention.get_desire() == 'move'){
                    if (!explore){
                        const args = intention.get_args()[0][0];
                       // console.log('[Agent] Discarding desire', intention.get_desire(), args, ', no longer valid.');
                        continue;
                    }
                }

				// Try to achieve the intention
				await intention.achieve();
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
        console.log( '[Agent] Stop agent queued intentions.');
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

    // Getter / Setter Functions
    get_desire() {
        return this.#desire;
    }

    get_args(){
        return this.#args;
    }

	// Functions
    stop () {
        console.log('[Intention] Stop intention and current plan.');
        this.#current_plan.stop();
    }

    async achieve () {
		if (this.#started){
			return this;  // if the intention will already be achieved
		}
		this.#started = true;
		console.log("[I] Try to select a plan.")

		/**
		 * Plan selection
		 */
		// TODO: how to select best plan?
		let best_plan;
		let best_plan_score = Number.MIN_VALUE;

		for (const plan of plans){
			if (plan.isApplicableTo(this.#desire)){
				this.#current_plan = plan;
				console.log('[I] Achieving desire ', this.#desire, ...this.#args, ' with plan ', plan, '.');
				try {
					const plan_res = await plan.execute(...this.#args);
                    if (plan_res){
                        console.log('[I] Plan ', plan, ' successfully achieved with result ', plan_res, '.');
                        return true;
                    }
                    else {
                        console.log('[I] Plan ', plan, ' failed.');
                        continue;
                    }
					
				} catch (error){
					console.log('[I] Plan ', plan, ' failed with error:', error);
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
        console.log('[Plan] Stop plan and all sub-intentions.');
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
            if (partnerId !== undefined){
                let reply = await client.ask(partnerId, `${x},${y}`+',can you go there?')

                // ask other agent to help
                if (Boolean(reply)){ 
                    console.log('[Delivery] Drop parcels for other agent to pick up.')
                    // blacklist all parcels I am carrying
                    for (const [p_id, parcel] of parcels.entries()){
                        if (parcel.carriedBy == me.id){
                            blacklisted_parcels.set(p_id, parcel);
                        }
                    }

                    // put all parcels down
                    client.putdown(); 
                }
            }
            
            return false;
        }

        let putdown_result = await client.putdown();        

        if(putdown_result.length > 0){
            // remove all parcels that were put down from parcel map (otherwise, it will get stuck on delivery tile)
            for (const [p_id, parcel] of parcels.entries()){
                if (parcel.carriedBy == me.id){
                    parcels.delete(p_id);
                    parcel_timers.delete(p_id);
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

        let pickup_result = await client.pickup();

        /*
        if (pickup_result){
            // Update carriedBy info of parcel that was picked up
            let p = array_args;
            p.carriedBy = me.id;
            console.log('[Pickup] Update info', p)
            parcels.set(array_args['id'], p);
            console.log(parcels.get(array_args['id']))
        }
        */
        return true;
    }
}

class BlindMove extends Plan {
    isApplicableTo ( desire ) {
		return desire == 'go_to';
    }

    async execute ( x, y ) {
        try {
            const path = await createPddlProblem(x, y, false);
            if (path.length > 0){
                for (const step of path){
                    if (step.action == 'LEFT'){
                        await client.move('left');
                    }
                    else if (step.action == 'RIGHT'){
                        await client.move('right');
                    }
                    else if (step.action == 'UP'){
                        await client.move('up');
                    }
                    else if (step.action == 'DOWN'){
                        await client.move('down');
                    }
                }
                return true;
            }
            return false;
            
        } catch(e){
            explore = true;
            console.log('[BlindMove] Stuck.');
            return false;
        }
    }
}

class RandomMove extends Plan {
    isApplicableTo(desire) {
        return desire === 'move';
    }

    async execute(...args) {
        explore = false;
        let array_args = args.shift().shift();
		let x = array_args['x'];
		let y = array_args['y'];

        const start = { x: me.x, y: me.y };
        const target = { x, y };

        const path = await findPath(start, target);
           
        if (path.length > 0){
            
            for (const { x: nextX, y: nextY } of path) {
                if(myAgent.intention_queue[myAgent.intention_queue.length - 1]?.get_desire() !== 'move' && myAgent.intention_queue[myAgent.intention_queue.length - 1]?.get_desire() !== undefined){
                    //i didn't find a method to continue the expression on the line below
                    console.log("[RandomMove] Parcel found! Changing intention");
                    this.stop(); //parcel found, change plan
                    return true; 
                }
                await moveTowards(nextX, nextY);
            }
    
            console.log('[RandomMove] Target reached.');
            return true;
        }else {
            return false;
        }
    }
}

plans.push(new Delivery() )
plans.push( new GoPickUp() )
plans.push( new BlindMove() )
plans.push( new RandomMove() )