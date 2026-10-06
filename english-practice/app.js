(()=>{
const KEY="englishPractice.v5", OLD=["englishPracticeStatic.v4","englishPracticeStatic.v3","englishPracticeStatic.v2","englishPracticeStatic.v1"];
const $=x=>document.getElementById(x);
const E={setup:$("setup"),train:$("train"),saved:$("saved"),matSelect:$("matSelect"),matName:$("matName"),raw:$("raw"),newMat:$("newMat"),delMat:$("delMat"),organize:$("organize"),start:$("start"),total:$("total"),summary:$("summary"),back:$("back"),title:$("title"),progress:$("progress"),menu:$("menu"),settings:$("settings"),closeMenu:$("closeMenu"),level:$("level"),secs:$("secs"),range:$("range"),smaller:$("smaller"),autoFont:$("autoFont"),bigger:$("bigger"),badge:$("badge"),clock:$("clock"),shown:$("shown"),answerBox:$("answerBox"),answer:$("answer"),feedback:$("feedback"),prev:$("prev"),replay:$("replay"),next:$("next"),prevLevel:$("prevLevel"),pause:$("pause"),nextLevel:$("nextLevel")};

let timer, tick, moveTimer, parsed, locked=false, paused=false, state=load();

const touchDevice=("ontouchstart" in window)||(navigator.maxTouchPoints>0);

function fresh(name="Meu material"){
  return{
    id:Date.now()+"_"+Math.random(),
    name,
    raw:"",
    settings:{secs:3,font:0},
    progress:{level:"l2",index:0}
  }
}

function load(){
  try{
    let r=localStorage.getItem(KEY);

    if(!r){
      for(const k of OLD){
        r=localStorage.getItem(k);
        if(r)break;
      }
    }

    if(!r){
      let m=fresh();
      return{active:m.id,materials:[m]};
    }

    let s=JSON.parse(r);

    s.materials.forEach(m=>{
      m.settings=Object.assign({secs:3,font:0},m.settings||{});
      m.progress=Object.assign({level:"l2",index:0},m.progress||{});

      if(m.progress.levelKey){
        m.progress.level=convertOld(m.progress.levelKey);
      }
    });

    s.active=s.active||s.activeId||s.materials[0].id;

    return s;

  }catch{
    let m=fresh();
    return{active:m.id,materials:[m]};
  }
}

function convertOld(k){
  if(k.startsWith("letters-"))return"l"+k.split("-")[1];
  if(k.startsWith("words-"))return"w"+k.split("-")[1];
  if(k.startsWith("sentences-"))return"s"+k.split("-")[1];
  return k;
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  E.saved.textContent="✓ Salvo automaticamente";
}

function active(){
  return state.materials.find(m=>m.id===state.active)||state.materials[0];
}

function words(s){
  try{
    return s.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[];
  }catch{
    return s.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g)||[];
  }
}

function letters(s){
  try{
    return(s.match(/\p{L}/gu)||[]).length;
  }catch{
    return(s.match(/[A-Za-z]/g)||[]).length;
  }
}

function norm(s){
  return s.replace(/\s+/g," ").trim();
}

function sentences(s){
  return(s.match(/[^.!?]+[.!?]+/g)||[]).map(norm);
}

function parse(raw){
  const base=raw.split("|").map(norm).filter(Boolean);
  const levels=[];

  for(let n=2;n<=7;n++){
    levels.push({
      key:"l"+n,
      label:n+" letras",
      group:"letters",
      items:base.filter(x=>words(x).length===1&&letters(words(x)[0])===n)
    });
  }

  for(let n=2;n<=10;n++){
    levels.push({
      key:"w"+n,
      label:n+" palavras",
      group:"words",
      items:base.filter(x=>words(x).length===n)
    });
  }

  let ss=[];

  base.forEach(x=>ss.push(...sentences(x)));

  for(let n=1;n<=4;n++){
    let a=[];

    for(let i=0;i+n<=ss.length;i++){
      a.push(ss.slice(i,i+n).join(" "));
    }

    levels.push({
      key:"s"+n,
      label:n===1?"1 frase":n+" frases",
      group:"sentences",
      items:a
    });
  }

  return{base,levels};
}

function levels(){
  return parsed.levels.filter(x=>x.items.length);
}

function currentLevel(){
  return levels().find(x=>x.key===active().progress.level)||levels()[0];
}

function current(){
  let l=currentLevel();
  let m=active();

  if(!l)return"";

  m.progress.index=Math.max(
    0,
    Math.min(m.progress.index,l.items.length-1)
  );

  return l.items[m.progress.index];
}

function sync(){
  let m=active();

  m.name=E.matName.value.trim()||"Meu material";
  m.raw=E.raw.value;

  parsed=parse(m.raw);

  renderMaterials();
  renderSummary();
  save();
}

function renderMaterials(){
  E.matSelect.innerHTML="";

  state.materials.forEach(m=>{
    let o=document.createElement("option");

    o.value=m.id;
    o.textContent=m.name;
    o.selected=m.id===state.active;

    E.matSelect.appendChild(o);
  });
}

function renderSummary(){
  E.total.textContent=parsed.base.length+" itens";
  E.summary.innerHTML="";

  for(const [g,t] of [
    ["letters","🔤 Por letras"],
    ["words","🧠 Por palavras"],
    ["sentences","📝 Por frases"]
  ]){

    let box=document.createElement("div");
    let h=document.createElement("h3");
    let grid=document.createElement("div");

    h.textContent=t;
    grid.className="group";

    parsed.levels
      .filter(x=>x.group===g)
      .forEach(l=>{

        let b=document.createElement("button");

        b.className="tile";
        b.innerHTML="<b>"+l.items.length+"</b>"+l.label;

        b.onclick=()=>{
          if(!l.items.length)return;

          let m=active();

          if(m.progress.level!==l.key){
            m.progress.level=l.key;
            m.progress.index=0;
          }

          save();
          start();
        };

        grid.appendChild(b);
      });

    box.append(h,grid);
    E.summary.appendChild(box);
  }
}

function loadForm(){
  let m=active();

  E.matName.value=m.name;
  E.raw.value=m.raw;

  parsed=parse(m.raw);

  renderMaterials();
  renderSummary();
}

function renderLevel(){
  let ls=levels();
  let m=active();

  if(!ls.length)return;

  if(!ls.some(x=>x.key===m.progress.level)){
    m.progress.level=ls[0].key;
    m.progress.index=0;
  }

  E.level.innerHTML="";

  ls.forEach(l=>{
    let o=document.createElement("option");

    o.value=l.key;
    o.textContent=l.label+" ("+l.items.length+")";
    o.selected=l.key===m.progress.level;

    E.level.appendChild(o);
  });
}

function size(text){
  let w=words(text).length;
  let c=text.length;

  let s=
    w<=1
      ?(c<=3?104:c<=5?92:c<=7?80:70)
      :w<=3?64
      :w<=6?50
      :w<=10?39
      :c<=180?30
      :c<=320?24
      :20;

  return Math.max(
    14,
    Math.min(116,s+active().settings.font)
  );
}

function clear(){
  clearTimeout(timer);
  clearInterval(tick);
  clearTimeout(moveTimer);
}

function show(){

  clear();

  locked=false;
  paused=false;

  E.pause.textContent="⏸ Pausar";

  let x=current();
  let l=currentLevel();
  let m=active();

  if(!l||!x)return;

  E.badge.textContent=l.label;

  E.progress.textContent=
    "Item "+(m.progress.index+1)+" de "+l.items.length;

  E.level.value=l.key;

  const keepKeyboard=
    touchDevice &&
    document.activeElement===E.answer;

  if(keepKeyboard){

    E.answer.value="";
    E.feedback.textContent="";

    E.answerBox.classList.remove("hidden");

    E.answerBox.style.visibility="hidden";
    E.answerBox.style.pointerEvents="none";

  }else{

    E.answerBox.classList.add("hidden");

    E.answerBox.style.visibility="";
    E.answerBox.style.pointerEvents="";
  }

  E.shown.classList.remove("hidden");

  E.shown.textContent=x;

  E.shown.style.fontSize=size(x)+"px";

  let s=Math.max(
    1,
    Math.min(
      300,
      +m.settings.secs||3
    )
  );

  let r=s;

  E.clock.textContent=r+"s";

  tick=setInterval(()=>{

    r--;

    E.clock.textContent=
      Math.max(0,r)+"s";

  },1000);

  timer=setTimeout(
    answerMode,
    s*1000
  );

  save();
}

function focusAnswer(){

  [0,40,120,250].forEach(ms=>

    setTimeout(()=>{

      if(
        !E.answerBox.classList.contains("hidden")
      ){

        E.answer.focus({
          preventScroll:true
        });

        let n=E.answer.value.length;

        try{
          E.answer.setSelectionRange(n,n);
        }catch{}

      }

    },ms)

  );
}

function answerMode(){

  clearTimeout(timer);
  clearInterval(tick);

  E.shown.classList.add("hidden");

  E.answerBox.classList.remove("hidden");

  E.answerBox.style.visibility="visible";
  E.answerBox.style.pointerEvents="auto";

  if(document.activeElement!==E.answer){
    E.answer.value="";
  }

  E.feedback.textContent="";

  E.clock.textContent="escreva";

  locked=false;

  focusAnswer();
}

function cleanAnswer(s){

  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[\u200B-\u200D\uFEFF]/g,"")
    .replace(/[“”]/g,'"')
    .replace(/['’‘`´]/g,"")
    .replace(/[.!?,;:]+$/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function check(){

  if(locked)return;

  if(
    cleanAnswer(E.answer.value)===
    cleanAnswer(current())
    &&
    E.answer.value.trim()
  ){

    locked=true;

    E.feedback.textContent="✅ Certo!";

    moveTimer=setTimeout(
      next,
      160
    );
  }
}

function next(){

  clear();

  let l=currentLevel();
  let m=active();

  m.progress.index=
    m.progress.index<l.items.length-1
      ?m.progress.index+1
      :0;

  save();

  show();
}

function prev(){

  clear();

  let l=currentLevel();
  let m=active();

  m.progress.index=
    m.progress.index>0
      ?m.progress.index-1
      :l.items.length-1;

  save();

  show();
}

function moveLevel(d){

  let ls=levels();
  let m=active();

  let i=ls.findIndex(
    x=>x.key===m.progress.level
  );

  if(i<0)return;

  m.progress.level=
    ls[(i+d+ls.length)%ls.length].key;

  m.progress.index=0;

  renderLevel();

  save();

  show();
}

function start(){

  sync();

  if(!levels().length)return;

  E.setup.classList.add("hidden");

  E.train.classList.remove("hidden");

  E.settings.classList.add("hidden");

  let m=active();

  E.title.textContent=m.name;

  E.secs.value=m.settings.secs;

  E.range.value=m.settings.secs;

  renderLevel();

  show();
}

function setSecs(v){

  v=Math.max(
    1,
    Math.min(
      300,
      +v||3
    )
  );

  active().settings.secs=v;

  E.secs.value=v;

  E.range.value=v;

  save();

  show();
}

E.matSelect.onchange=()=>{

  sync();

  state.active=E.matSelect.value;

  loadForm();

  save();
};

E.matName.oninput=sync;

E.raw.oninput=sync;

E.organize.onclick=sync;

E.start.onclick=start;

E.newMat.onclick=()=>{

  let m=fresh(
    "Material "+(state.materials.length+1)
  );

  state.materials.push(m);

  state.active=m.id;

  save();

  loadForm();
};

E.delMat.onclick=()=>{

  let m=active();

  if(
    !confirm(
      "Excluir “"+m.name+"”?"
    )
  )return;

  if(state.materials.length===1){

    let n=fresh();

    state.materials=[n];

    state.active=n.id;

  }else{

    state.materials=
      state.materials.filter(
        x=>x.id!==m.id
      );

    state.active=
      state.materials[0].id;
  }

  save();

  loadForm();
};

E.back.onclick=()=>{

  clear();

  E.train.classList.add("hidden");

  E.setup.classList.remove("hidden");

  loadForm();
};

E.menu.onclick=()=>{
  E.settings.classList.toggle("hidden");
};

E.closeMenu.onclick=()=>{
  E.settings.classList.add("hidden");
};

E.level.onchange=()=>{

  active().progress.level=
    E.level.value;

  active().progress.index=0;

  save();

  E.settings.classList.add("hidden");

  show();
};

E.secs.onchange=e=>
  setSecs(e.target.value);

E.range.oninput=e=>
  E.secs.value=e.target.value;

E.range.onchange=e=>
  setSecs(e.target.value);

document
  .querySelectorAll("[data-s]")
  .forEach(
    b=>
      b.onclick=()=>
        setSecs(b.dataset.s)
  );

E.smaller.onclick=()=>{

  active().settings.font=
    Math.max(
      -50,
      active().settings.font-4
    );

  save();

  show();
};

E.autoFont.onclick=()=>{

  active().settings.font=0;

  save();

  show();
};

E.bigger.onclick=()=>{

  active().settings.font=
    Math.min(
      50,
      active().settings.font+4
    );

  save();

  show();
};

E.answer.oninput=check;

E.prev.onclick=prev;

E.next.onclick=next;

E.replay.onclick=show;

E.prevLevel.onclick=()=>
  moveLevel(-1);

E.nextLevel.onclick=()=>
  moveLevel(1);

E.pause.onclick=()=>{

  if(paused){

    show();

  }else{

    paused=true;

    clear();

    E.pause.textContent=
      "▶ Continuar";

    E.clock.textContent=
      "pausado";
  }
};

window.addEventListener(
  "pagehide",
  save
);

document.addEventListener(
  "visibilitychange",
  ()=>{
    if(document.hidden){
      save();
    }
  }
);

loadForm();

})();
