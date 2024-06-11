# Install everything
You'll need node js, you can download it at https://nodejs.org/en/

Once everything is set up you need to go on terminal and run

```
git clone https://github.com/unitn-ASA/Deliveroo.js.git
cd Deliveroo.js
npm install
npm install @unitn-asa/deliveroo-js-client
git clone https://github.com/unitn-ASA/DeliverooAgent.js
cd DeliverooAgents.js
npm install
git clone https://github.com/Sminnitex/ASAProject
npm install @unitn-asa/pddl-client@0.0.37
```

# Create a basic environment
Create a file called ".env" and copy and paste

```
# Passphrase used to generate jwt token
SUPER_SECRET='default_token_private_key'
# Web server port; 8080 if not specified
PORT='8080'
# File in ./files to load a specific configuration
LEVEL='level_1'
```

Then on terminal run on the Deliveroo.js directory
```
npm run dev
```
To modify the level you can modify both the .env or the level_1 files

# To run the agent
After you set the environment go on a terminal and run inside the ASAProject direcotry
```
node pizzaAgent
node strudelAgent
```

# Run in local with pddl planner

To install the planner we used
```
sudo apt update
sudo apt install cmake g++ make python3
git clone https://github.com/aibasel/downward/
cd downward
./build.py
```

To test the planner
```
./fast-downward.py misc/tests/benchmarks/miconic/s1-0.pddl --search "astar(lmcut())"
./fast-downward.py misc/tests/benchmarks/miconic/s1-0.pddl --search "astar(operatorcounting([lmcut_constraints()]))"
```

To use the planner on our pddl
```
./fast-downward.py ../path/to/ASAProject/domain-deliveroo.pddl ../path/to/ASAProject/problem-deliveroo.pddl --search "astar(lmcut())"
```



