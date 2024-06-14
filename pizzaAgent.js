import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { PddlDomain, PddlAction, PddlProblem, PddlExecutor, onlineSolver, Beliefset } from "@unitn-asa/pddl-client";
import fs from 'fs';

// server and key of the agent
const client = new DeliverooApi(
    'http://localhost:8080/',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2Njk1ZDM5ZGFjIiwibmFtZSI6Ik11bmljaE1hZmlhXzEiLCJpYXQiOjE3MTc0MTY1MDh9.4bNvXhzn2OQpOcVVc2M_ypwvajh9g5MOalux23eumLA'
)


// function to read the PDDL domain file
function readFile ( path ) {   
    return new Promise( (res, rej) => {
        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })
}

/**
* PDDL
**/

var start_char = "t";
var separator = "_";
let domain = await readFile('./domain-deliveroo.pddl' );  // read in domain file

// function to check if an agent is in a certain tile
function agentIn(x, y){
    for (const [_, a] of agents.entries()){  // loop through all agents
        if (a.x === x && a.y === y){  // check if they are on the tile
            return true;
        }
        else {
            return false;
        }
    }
}

// generate the options LEFT, RIGHT, UP, DOWN for the PDDL problem for all tiles
function generateTileInit(tileMap) {
    let initStr = '';

    // loop through the map of tiles by row, then by column
    for (let [x, col] of tileMap.entries()) {
        for (let [y, _] of col.entries()) {
            let currentTile = `${start_char}${x}${separator}${y}`;  // entry for current tile
            
            // LEFT and RIGHT relationship
            if (tileMap.has(x + 1) && tileMap.get(x + 1).has(y)) {
                let rightTile = `${start_char}${x + 1}${separator}${y}`;

                // check if tiles are occupied by agents before adding relationship
                if (!agentIn(x, y)){
                    initStr += `(left ${rightTile} ${currentTile}) `;
                }
                if (!agentIn(x+1, y)){
                    initStr += `(right ${currentTile} ${rightTile}) `;
                }      
            }

            // DOWN and UP relationship
            if (tileMap.has(x) && tileMap.get(x).has(y + 1)) {
                let upTile = `${start_char}${x}${separator}${y + 1}`;

                // check if tiles are occupied by agents before adding relationship
                if (!agentIn(x, y)){
                    initStr += `(down ${upTile} ${currentTile}) `;
                }
                if (!agentIn(x, y+1)){
                    initStr += `(up ${currentTile} ${upTile}) `;
                }  
            }
        }
    }

    return initStr.trim();
}

// remove invalid characters from the PDDL problem file
function RemoveInvalidObjects(beliefSet) {
    const invalidCharacters = ['(', ')'];
    beliefSet.objects.forEach(obj => {
      if (invalidCharacters.some(char => obj.includes(char))) {
        beliefSet.removeObject(obj);
      } 
    });
}

// create a PDDL problem file to move to (x,y)
async function createPddlProblem(x, y){
    const myBeliefset = new Beliefset();
    myBeliefset.declare( 'me ' + me.name );  // myself

    // my position
    myBeliefset.declare( 'at ' + me.name + ' ' + start_char + Math.round(me.x) +  separator + Math.round(me.y));

    let init = generateTileInit(tile);  // the map and other agents
    myBeliefset.declare(init.substring(1, init.length - 1));
    RemoveInvalidObjects(myBeliefset);

    var pddlProblem = new PddlProblem(
        'deliveroo-go_to',
        myBeliefset.objects.at(0) + " - agent\n" + myBeliefset.objects.slice(1).join(" ") + " - tile\n" + "p1" + " - parcel",
        myBeliefset.toPddlString(),
        'at ' + me.name + ' ' + start_char + x  + separator + y 
        )  // the goal
    
    let problem = pddlProblem.toPddlString();
    var plan = await onlineSolver(domain, problem);  // solve the problem and receive plan
    return plan;  
}


/**
* General Purpose Functions
**/

// calculate the euclidean distance between two positions
function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) );
    const dy = Math.abs( Math.round(y1) - Math.round(y2) );
    return dx + dy;
}

// select the closest tile from a list of tiles
function select_closest_tile (tiles){
    let nearest_distance = Number.MAX_VALUE;
    let closest_tile;

    for (const tile of tiles){  // loop through tiles
        const distance_tile = distance(me, tile);  // calculate distance

        if (distance_tile < nearest_distance){  // compare
             nearest_distance = distance_tile;
             closest_tile = tile;
        }
    }
    return closest_tile;
}

// select a random tile from a list of weighted tiles
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

// select a random tile from the whole map
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

            // Associate weights to have exploration more probable on tiles closer to the center of the map
            const distance_from_center = distance(tile, map_center);
            const weight = 1 / (distance_from_center + 1);
            weights.push(weight);
        }
    }
    
    // Use the select_random_tile function to select a random tile, with weights
    return select_random_tile(allTiles, weights);
}

// get the current goal of the agent
function getCurrentGoal(){
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

// config parameters
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

// myself and my position
const me = {};
client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id;
        me.name = name;
        me.x = x;
        me.y = y;
        me.score = score;
} )


// parcels
let parcel_timer = Date.now();
const parcels = new Map();
const parcel_timers = new Map();
const blacklisted_parcels = new Map();  // the ones we don't want to pick up anymore

client.onParcelsSensing( async ( perceived_parcels ) => {
    for (const p of perceived_parcels) {
		// p is {id, x, y, carriedBy, reward}
        parcels.set(p.id, p);
        parcel_timers.set(p.id, Date.now());
    }
    // check if parcels were not seen in along time, then delete them
    for (const [p_id, time] of parcel_timers.entries()){
        if (Date.now() - time >= PARCEL_DECADING_INTERVAL * PARCEL_REWARD_AVG){
            parcels.delete(p_id);
            parcel_timers.delete(p_id);
            blacklisted_parcels.delete(p_id);
        }
    }

    // send parcels to partner every 5s
    if (partnerId !== undefined && parcels.size > 0 && Date.now() - parcel_timer > 5000){
        parcel_timer = Date.now();  // send max. every 5s

        var parcelString = `Parcels,${parcels.size},`;
        for (const [_, p] of parcels.entries()){
            parcelString += `${p.id}-${p.x}-${p.y}-${p.carriedBy}-${p.reward},`
        }
        client.say(partnerId, parcelString);
    }
} )


// the map tiles
/**
 * @type {Map<x,Map<y,{x,y,delivery}>}
 */
const tile = new Map();
const deliveryTile = new Set();

client.onTile( ( x, y, delivery ) => {
    if (! tile.has(x)){  // add new row
		tile.set(x, new Map);
	}      
    tile.get(x).set(y, {x, y, delivery});  // add tile

    if (delivery){  // create separate list of delivery tiles
        deliveryTile.add({x, y});
    }
} );

// agents
let agent_timer = Date.now();
const agents = new Map();
client.onAgentsSensing ((perceived_agents) =>{
    for (const a of perceived_agents){
        agents.set(a.id, a);  // set agent position
    }

    // send agents to partner every 10s
    if (partnerId !== undefined && agents.size > 0 && Date.now() - agent_timer > 10000){
        agent_timer = Date.now();  // send max. every 10s

        var agentString = `Agents,${agents.size},`;
        for (const [_, a] of agents.entries()){
            agentString += `${a.id}-${a.name}-${a.x}-${a.y}-${a.score},`
        }
        client.say(partnerId, agentString);
    }
})

// message exchange
let partnerId;
client.onMsg(async (id, name, msg, reply) => {
    if (partnerId == undefined && name == 'MunichMafia_2'){  // receive partner ID for first time
        partnerId = id;
        console.log('PARTNER ID', partnerId)      
          client.say(partnerId, 'stop broadcasting your id.')
    }
    if (id == partnerId && msg === 'stop broadcasting your id.'){  // partner tells me to stop broadcasting my ID
        broadcast_id = false;
    }
    
    if(name === "MunichMafia_2"){  // only react on messages from partner
        let msg_split = msg.split(",");

        // Delivery - check if I can go to a certain position
        if(msg_split[2] === 'can you go there?'){
            let reach = await createPddlProblem(parseFloat(msg_split[0]), parseFloat(msg_split[1]))
            
            if(reach.length > 0){
                reply(String(true));
            }
            else {
                reply(String(false));
            }
        }

        // Pickup - tell my partner where I am going
        if (msg_split[2] == 'where are you going?'){
             // Get the current coordinates of the agent
            let { x, y } = getCurrentGoal();
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
                    carriedBy = undefined;
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


let explore = false;  // whether RandomMove should be used
let broadcast_id = true;  // whether to broadcast my ID
let shout_timer = Date.now();

/**
* BDI Control Loop
**/

function agentLoop() {
    
    /**
     * Generate Options
     */

	const options = [];

    // broadcast my ID so my partner gets it - only executed in the beginning
    if (broadcast_id && partnerId === undefined){
        if (Date.now() - shout_timer > 3000){  // every 3s
            client.shout("HELLO");
            shout_timer = Date.now();
        }
        
    }

    // Loop over all parcels
	for (const [p_id, parcel] of parcels.entries()){
        if (parcel.reward <= 1){  // if the parcel will disappear soon, ignore it
            parcels.delete(p_id);
            parcel_timers.delete(p_id);
            continue;
        }
		else if (parcel.carriedBy){
            if (parcel.carriedBy == me.id){  // if I have the parcel, deliver it
                if (deliveryTile.size > 0){
                    options.push({
                        desire: 'deliver',
                        args: [select_closest_tile(deliveryTile)]
                    })
                }
                continue;
            }
            else {  // if someone else has the parcel, delete it
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

    if (explore){  // if nothing else is possible, explore the map using RandomMove
        options.push({
            desire: "move",
            args: [select_random_tile_from_map(tile)]
        });
    }
    
    /**
     * Select best intention - choose closest
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
           // execute move immediately because we are either stuck or have nothing else to do
           best_option = option;
           nearest_distance = distance(me, option.args[0]);
           break;
           
        }
		
	}

    /**
     * Queue intention 
     */
	if (best_option){
		myAgent.queue(best_option.desire, best_option.args);
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
                    // check if someone (including me) already has the parcel or if it is blacklisted
                    const args = intention.get_args()[0][0];
                    if (parcels.get(args.id) == undefined || parcels.get(args.id).carriedBy != null || blacklisted_parcels.get(args.id) != undefined ){
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
                        continue;
                    } 
                }
                else if(intention.get_desire() == 'move'){
                    // check if I still want to explore
                    if (!explore){
                        const args = intention.get_args()[0][0];
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
myAgent.intentionLoop();  // execute continously


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
		for (const plan of plans){  // try all applicable plans
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


/**
 * Plans
 */

class Delivery extends Plan{
    isApplicableTo ( desire ){
        return desire == 'deliver';
    }

    async execute (...args){
        let array_args = args.shift().shift();
        let x = array_args['x'];
		let y = array_args['y'];
    
        // use subintention to reach delivery tile
        let res = await this.subIntention('go_to', x, y);
        if (!res){  // if I can not reach it
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

        // use subintention to reach parcel tile
        let res = await this.subIntention('go_to', x, y);
        if (!res){
            return false;
        }

        let pickup_result = await client.pickup();
        return true;
    }
}

class PlannedMove extends Plan {
    isApplicableTo ( desire ) {
		return desire == 'go_to';
    }

    async execute ( x, y ) {
        try {
            explore = false;

            // use the PDDL solver to find a path
            const path = await createPddlProblem(x, y);
            if (path.length > 0){
                // execute planned path
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
            console.log('[PlannedMove] Stuck.');
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

        // use the PDDL solver to find a path
        const path = await createPddlProblem(x, y);
           
        if (path.length > 0){
            // execute the planned path
            for (const step of path){
                // If I find another desire, stop and change plan
                if(myAgent.intention_queue[myAgent.intention_queue.length - 1]?.get_desire() !== 'move' && myAgent.intention_queue[myAgent.intention_queue.length - 1]?.get_desire() !== undefined){
                    console.log("[RandomMove] Parcel found! Changing intention");
                    this.stop(); //parcel found, change plan
                    return true; 
                }
                else if (step.action == 'LEFT'){
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
            console.log('[RandomMove] Target reached.')
            return true;
        }
        return false;
    }
}

// push all existing plans to the list of possible plans
plans.push(new Delivery() )
plans.push( new GoPickUp() )
plans.push( new PlannedMove() )
plans.push( new RandomMove() )