const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
function element(){return {textContent:'0',style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},appendChild(){},addEventListener(){},focus(){},querySelector(){return element()},querySelectorAll(){return []},getBoundingClientRect(){return {width:400,left:0,top:0}},getContext(){return {clearRect(){}}}};}
const elements={};
const context=vm.createContext({console,document:{getElementById:id=>elements[id]??=element(),createElement:element,createDocumentFragment:element,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},body:element()},window:{innerWidth:400,innerHeight:800,addEventListener(){},matchMedia:()=>({matches:true})},localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},setInterval:()=>1,clearInterval(){},setTimeout:fn=>{fn();return 1},requestAnimationFrame(){}});
vm.runInContext(fs.readFileSync('game.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('board.flat().filter(Boolean).length'),2);
run('board=[[2,2,2,2],[0,0,0,0],[0,0,0,0],[0,0,0,0]];handleMoveWithPositions("left")');
assert.equal(run('board[0][0]'),4);assert.equal(run('board[0][1]'),4);assert.equal(run('score'),8);
run('board=[[4,8,16,32],[2,4,8,16],[4,8,16,32],[2,4,8,16]];handleMoveWithPositions("left")');
assert.ok(run('!!prevState'));run('undo()');assert.equal(run('score'),0);assert.equal(run('moves'),0);
for(const dir of ['left','right','up','down']){run(`initGame();board=[[2,2,0,0],[2,0,0,0],[0,0,0,0],[0,0,0,0]];handleMoveWithPositions('${dir}')`);assert.equal(run('moves'),1);}
run('gameMode="zen";initGame();board=[[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];checkGameStatus()');assert.equal(run('gameActive'),false);
console.log('PASS merges, four directions, invalid move + undo, Zen dead end, unavailable storage');
