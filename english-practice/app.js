(()=>{
const KEY="englishPractice.v5", OLD=["englishPracticeStatic.v4","englishPracticeStatic.v3","englishPracticeStatic.v2","englishPracticeStatic.v1"];
const $=x=>document.getElementById(x);

const E={
  setup:$("setup"),
  train:$("train"),
  settingsPage:$("settingsPage"),
  saved:$("saved"),
  matSelect:$("matSelect"),
  matName:$("matName"),
  raw:$("raw"),
  newMat:$("newMat"),
  delMat:$("delMat"),
  organize:$("organize"),
  start:$("start"),
  total:$("total"),
  summary:$("summary"),
  back:$("back"),
  materialBackToTrain:$("materialBackToTrain"),
  title:$("title"),
  progress:$("progress"),
  menu:$("menu"),
  openSettings:$("openSettings"),
  settings:$("settings"),
  settingsBackToTrain:$("settingsBackToTrain"),
  closeMenu:$("closeMenu"),
  level:$("level"),
  secs:$("secs"),
  range:$("range"),
  smaller:$("smaller"),
  autoFont:$("autoFont"),
  bigger:$("bigger"),
  badge:$("badge"),
  clock:$("clock"),
  shown:$("shown"),
  practiceStartBtn:$("practiceStartBtn"),
  answerBox:$("answerBox"),
  answer:$("answer"),
  feedback:$("feedback"),
  prev:$("prev"),
  replay:$("replay"),
  next:$("next"),
  prevLevel:$("prevLevel"),
  pause:$("pause"),
  nextLevel:$("nextLevel")
};


let timer;
let tick;
let moveTimer;

let parsed;

let locked=false;
let paused=false;

let practiceActive=false;

let state=load();


const touchDevice=
  ("ontouchstart" in window) ||
  (navigator.maxTouchPoints>0);


/* =========================================================
   MATERIAL NOVO
   ========================================================= */

function fresh(name="Meu material"){

  return{

    id:
      Date.now()+
      "_"+
      Math.random(),

    name,

    raw:"",

    settings:{
      secs:3,
      font:0
    },

    progress:{
      level:"l2",
      index:0
    }

  };

}


/* =========================================================
   CARREGAR
   ========================================================= */

function load(){

  try{

    let r=
      localStorage.getItem(
        KEY
      );


    if(!r){

      for(const k of OLD){

        r=
          localStorage.getItem(
            k
          );

        if(r){
          break;
        }

      }

    }


    if(!r){

      let m=fresh();

      return{
        active:m.id,
        materials:[m]
      };

    }


    let s=
      JSON.parse(
        r
      );


    s.materials.forEach(
      m=>{

        m.settings=
          Object.assign(
            {
              secs:3,
              font:0
            },
            m.settings||{}
          );


        m.progress=
          Object.assign(
            {
              level:"l2",
              index:0
            },
            m.progress||{}
          );


        if(
          m.progress.levelKey
        ){

          m.progress.level=
            convertOld(
              m.progress.levelKey
            );

        }

      }
    );


    s.active=
      s.active ||
      s.activeId ||
      s.materials[0].id;


    return s;

  }

  catch{

    let m=fresh();

    return{
      active:m.id,
      materials:[m]
    };

  }

}


/* =========================================================
   CONVERTER NÍVEL ANTIGO
   ========================================================= */

function convertOld(k){

  if(
    k.startsWith(
      "letters-"
    )
  ){

    return(
      "l"+
      k.split("-")[1]
    );

  }


  if(
    k.startsWith(
      "words-"
    )
  ){

    return(
      "w"+
      k.split("-")[1]
    );

  }


  if(
    k.startsWith(
      "sentences-"
    )
  ){

    return(
      "s"+
      k.split("-")[1]
    );

  }


  return k;

}


/* =========================================================
   SALVAR
   ========================================================= */

function save(){

  localStorage.setItem(
    KEY,
    JSON.stringify(
      state
    )
  );


  if(E.saved){

    E.saved.textContent=
      "✓ Salvo automaticamente";

  }

}


/* =========================================================
   MATERIAL ATIVO
   ========================================================= */

function active(){

  return(
    state.materials.find(
      m=>m.id===state.active
    )
    ||
    state.materials[0]
  );

}


/* =========================================================
   PALAVRAS
   ========================================================= */

function words(s){

  try{

    return(
      s.match(
        /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu
      )
      ||
      []
    );

  }

  catch{

    return(
      s.match(
        /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g
      )
      ||
      []
    );

  }

}


/* =========================================================
   LETRAS
   ========================================================= */

function letters(s){

  try{

    return(
      (
        s.match(
          /\p{L}/gu
        )
        ||
        []
      ).length
    );

  }

  catch{

    return(
      (
        s.match(
          /[A-Za-z]/g
        )
        ||
        []
      ).length
    );

  }

}


/* =========================================================
   NORMALIZAR TEXTO
   ========================================================= */

function norm(s){

  return(
    s
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );

}


/* =========================================================
   FRASES
   ========================================================= */

function sentences(s){

  return(
    (
      s.match(
        /[^.!?]+[.!?]+/g
      )
      ||
      []
    )
      .map(
        norm
      )
  );

}


/* =========================================================
   ORGANIZAR MATERIAL
   ========================================================= */

function parse(raw){

  const base=
    raw
      .split("|")
      .map(norm)
      .filter(Boolean);


  const levels=[];


  /* LETRAS */

  for(
    let n=2;
    n<=7;
    n++
  ){

    levels.push({

      key:"l"+n,

      label:
        n+
        " letras",

      group:
        "letters",

      items:
        base.filter(
          x=>
            words(x).length===1
            &&
            letters(
              words(x)[0]
            )===n
        )

    });

  }


  /* PALAVRAS */

  for(
    let n=2;
    n<=10;
    n++
  ){

    levels.push({

      key:
        "w"+n,

      label:
        n+
        " palavras",

      group:
        "words",

      items:
        base.filter(
          x=>
            words(x).length===n
        )

    });

  }


  /* FRASES */

  let ss=[];


  base.forEach(
    x=>
      ss.push(
        ...sentences(x)
      )
  );


  for(
    let n=1;
    n<=4;
    n++
  ){

    let a=[];


    for(
      let i=0;
      i+n<=ss.length;
      i++
    ){

      a.push(
        ss
          .slice(
            i,
            i+n
          )
          .join(" ")
      );

    }


    levels.push({

      key:
        "s"+n,

      label:
        n===1
          ?"1 frase"
          :n+" frases",

      group:
        "sentences",

      items:a

    });

  }


  return{
    base,
    levels
  };

}


/* =========================================================
   NÍVEIS DISPONÍVEIS
   ========================================================= */

function levels(){

  return(
    parsed.levels.filter(
      x=>x.items.length
    )
  );

}


/* =========================================================
   NÍVEL ATUAL
   ========================================================= */

function currentLevel(){

  return(
    levels().find(
      x=>
        x.key===
        active().progress.level
    )
    ||
    levels()[0]
  );

}


/* =========================================================
   ITEM ATUAL
   ========================================================= */

function current(){

  let l=
    currentLevel();

  let m=
    active();


  if(!l){
    return "";
  }


  m.progress.index=
    Math.max(
      0,
      Math.min(
        m.progress.index,
        l.items.length-1
      )
    );


  return(
    l.items[
      m.progress.index
    ]
  );

}


/* =========================================================
   SINCRONIZAR MATERIAL
   ========================================================= */

function sync(){

  let m=
    active();


  m.name=
    E.matName.value.trim()
    ||
    "Meu material";


  m.raw=
    E.raw.value;


  parsed=
    parse(
      m.raw
    );


  renderMaterials();

  renderSummary();

  save();

}


/* =========================================================
   LISTA DE MATERIAIS
   ========================================================= */

function renderMaterials(){

  E.matSelect.innerHTML="";


  state.materials.forEach(
    m=>{

      let o=
        document.createElement(
          "option"
        );


      o.value=
        m.id;


      o.textContent=
        m.name;


      o.selected=
        m.id===
        state.active;


      E.matSelect.appendChild(
        o
      );

    }
  );

}


/* =========================================================
   RESUMO DO MATERIAL
   ========================================================= */

function renderSummary(){

  E.total.textContent=
    parsed.base.length+
    " itens";


  E.summary.innerHTML="";


  for(
    const [g,t]
    of
    [

      [
        "letters",
        "🔤 Por letras"
      ],

      [
        "words",
        "🧠 Por palavras"
      ],

      [
        "sentences",
        "📝 Por frases"
      ]

    ]
  ){

    let box=
      document.createElement(
        "div"
      );


    let h=
      document.createElement(
        "h3"
      );


    let grid=
      document.createElement(
        "div"
      );


    h.textContent=
      t;


    grid.className=
      "group";


    parsed.levels

      .filter(
        x=>x.group===g
      )

      .forEach(
        l=>{

          let b=
            document.createElement(
              "button"
            );


          b.className=
            "tile";


          b.innerHTML=
            "<b>"+
            l.items.length+
            "</b>"+
            l.label;


          b.onclick=
            ()=>{

              if(
                !l.items.length
              ){
                return;
              }


              let m=
                active();


              if(
                m.progress.level
                !==
                l.key
              ){

                m.progress.level=
                  l.key;


                m.progress.index=
                  0;

              }


              save();


              openTrain();

            };


          grid.appendChild(
            b
          );

        }
      );


    box.append(
      h,
      grid
    );


    E.summary.appendChild(
      box
    );

  }

}


/* =========================================================
   CARREGAR FORMULÁRIO
   ========================================================= */

function loadForm(){

  let m=
    active();


  E.matName.value=
    m.name;


  E.raw.value=
    m.raw;


  parsed=
    parse(
      m.raw
    );


  renderMaterials();

  renderSummary();

}


/* =========================================================
   RENDERIZAR NÍVEIS
   ========================================================= */

function renderLevel(){

  let ls=
    levels();


  let m=
    active();


  if(
    !ls.length
  ){
    return;
  }


  if(
    !ls.some(
      x=>
        x.key===
        m.progress.level
    )
  ){

    m.progress.level=
      ls[0].key;


    m.progress.index=
      0;

  }


  E.level.innerHTML="";


  ls.forEach(
    l=>{

      let o=
        document.createElement(
          "option"
        );


      o.value=
        l.key;


      o.textContent=
        l.label+
        " ("+
        l.items.length+
        ")";


      o.selected=
        l.key===
        m.progress.level;


      E.level.appendChild(
        o
      );

    }
  );

}


/* =========================================================
   TAMANHO DA LETRA
   ========================================================= */

function size(text){

  let w=
    words(text).length;


  let c=
    text.length;


  let s=

    w<=1

      ?(
        c<=3
          ?104
          :c<=5
            ?92
            :c<=7
              ?80
              :70
      )

      :w<=3
        ?64

        :w<=6
          ?50

          :w<=10
            ?39

            :c<=180
              ?30

              :c<=320
                ?24

                :20;


  return(
    Math.max(
      14,
      Math.min(
        116,
        s+
        active().settings.font
      )
    )
  );

}


/* =========================================================
   LIMPAR TEMPORIZADORES
   ========================================================= */

function clear(){

  clearTimeout(
    timer
  );


  clearInterval(
    tick
  );


  clearTimeout(
    moveTimer
  );

}


/* =========================================================
   ESCONDER TELAS
   ========================================================= */

function hideAllPages(){

  if(E.setup){

    E.setup.classList.add(
      "hidden"
    );

  }


  if(E.train){

    E.train.classList.add(
      "hidden"
    );

  }


  if(E.settingsPage){

    E.settingsPage.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   TELA DE TREINO PARADA
   ========================================================= */

function showPracticeIdle(){

  clear();


  practiceActive=false;

  locked=false;

  paused=false;


  if(
    E.practiceStartBtn
  ){

    E.practiceStartBtn
      .classList
      .remove(
        "hidden"
      );

  }


  if(
    E.shown
  ){

    E.shown
      .classList
      .add(
        "hidden"
      );

  }


  if(
    E.answerBox
  ){

    E.answerBox
      .classList
      .add(
        "hidden"
      );

  }


  if(
    E.feedback
  ){

    E.feedback.textContent=
      "";

  }


  if(
    E.clock
  ){

    E.clock.textContent=
      "";

  }


  let l=
    currentLevel();


  let m=
    active();


  if(l){

    if(E.badge){

      E.badge.textContent=
        l.label;

    }


    if(E.progress){

      E.progress.textContent=
        "Item "+
        (
          m.progress.index+1
        )+
        " de "+
        l.items.length;

    }

  }

  else{

    if(E.badge){

      E.badge.textContent=
        "";

    }


    if(E.progress){

      E.progress.textContent=
        "";

    }

  }

}


/* =========================================================
   ABRIR TREINO
   ========================================================= */

function openTrain(){

  hideAllPages();


  if(E.train){

    E.train.classList.remove(
      "hidden"
    );

  }


  let m=
    active();


  if(E.title){

    E.title.textContent=
      m.name;

  }


  if(E.secs){

    E.secs.value=
      m.settings.secs;

  }


  if(E.range){

    E.range.value=
      m.settings.secs;

  }


  renderLevel();


  showPracticeIdle();

}


/* =========================================================
   ABRIR MATERIAL
   ========================================================= */

function openMaterial(){

  clear();


  practiceActive=false;


  hideAllPages();


  if(E.setup){

    E.setup.classList.remove(
      "hidden"
    );

  }


  loadForm();

}


/* =========================================================
   ABRIR CONFIGURAÇÕES
   ========================================================= */

function openSettingsPage(){

  clear();


  practiceActive=false;


  hideAllPages();


  if(E.settingsPage){

    E.settingsPage.classList.remove(
      "hidden"
    );

  }


  let m=
    active();


  if(E.secs){

    E.secs.value=
      m.settings.secs;

  }


  if(E.range){

    E.range.value=
      m.settings.secs;

  }


  renderLevel();

}


/* =========================================================
   COMEÇAR EXERCÍCIO
   ========================================================= */

function beginPractice(){

  sync();


  if(
    !levels().length
  ){

    openMaterial();

    return;

  }


  practiceActive=true;


  if(
    E.practiceStartBtn
  ){

    E.practiceStartBtn
      .classList
      .add(
        "hidden"
      );

  }


  show();

}


/* =========================================================
   MOSTRAR PALAVRA / FRASE
   ========================================================= */

function show(){

  clear();


  practiceActive=true;


  if(
    E.practiceStartBtn
  ){

    E.practiceStartBtn
      .classList
      .add(
        "hidden"
      );

  }


  locked=false;

  paused=false;


  if(E.pause){

    E.pause.textContent=
      "⏸ Pausar";

  }


  let x=
    current();


  let l=
    currentLevel();


  let m=
    active();


  if(
    !l ||
    !x
  ){

    return;

  }


  E.badge.textContent=
    l.label;


  E.progress.textContent=
    "Item "+
    (
      m.progress.index+1
    )+
    " de "+
    l.items.length;


  E.level.value=
    l.key;


  const keepKeyboard=

    touchDevice

    &&

    document.activeElement===
    E.answer;


  if(
    keepKeyboard
  ){

    E.answer.value="";

    E.feedback.textContent="";


    E.answerBox
      .classList
      .remove(
        "hidden"
      );


    E.answerBox.style.visibility=
      "hidden";


    E.answerBox.style.pointerEvents=
      "none";

  }

  else{

    E.answerBox
      .classList
      .add(
        "hidden"
      );


    E.answerBox.style.visibility=
      "";


    E.answerBox.style.pointerEvents=
      "";

  }


  E.shown
    .classList
    .remove(
      "hidden"
    );


  E.shown.textContent=
    x;


  E.shown.style.fontSize=
    size(x)+
    "px";


  let s=
    Math.max(
      1,
      Math.min(
        300,
        +m.settings.secs
        ||
        3
      )
    );


  let r=s;


  E.clock.textContent=
    r+
    "s";


  tick=
    setInterval(
      ()=>{

        r--;


        E.clock.textContent=
          Math.max(
            0,
            r
          )+
          "s";

      },
      1000
    );


  timer=
    setTimeout(
      answerMode,
      s*1000
    );


  save();

}


/* =========================================================
   FOCO NO CAMPO
   ========================================================= */

function focusAnswer(){

  [
    0,
    40,
    120,
    250
  ]
    .forEach(
      ms=>

        setTimeout(
          ()=>{

            if(
              !E.answerBox
                .classList
                .contains(
                  "hidden"
                )
            ){

              E.answer.focus({
                preventScroll:true
              });


              let n=
                E.answer.value.length;


              try{

                E.answer.setSelectionRange(
                  n,
                  n
                );

              }
              catch{}

            }

          },
          ms
        )

    );

}


/* =========================================================
   MODO RESPOSTA
   ========================================================= */

function answerMode(){

  clearTimeout(
    timer
  );


  clearInterval(
    tick
  );


  E.shown
    .classList
    .add(
      "hidden"
    );


  E.answerBox
    .classList
    .remove(
      "hidden"
    );


  E.answerBox.style.visibility=
    "visible";


  E.answerBox.style.pointerEvents=
    "auto";


  if(
    document.activeElement
    !==
    E.answer
  ){

    E.answer.value=
      "";

  }


  E.feedback.textContent=
    "";


  E.clock.textContent=
    "escreva";


  locked=false;


  focusAnswer();

}


/* =========================================================
   LIMPAR RESPOSTA
   ========================================================= */

function cleanAnswer(s){

  return(
    s
      .toLowerCase()

      .normalize(
        "NFD"
      )

      .replace(
        /[\u0300-\u036f]/g,
        ""
      )

      .replace(
        /[\u200B-\u200D\uFEFF]/g,
        ""
      )

      .replace(
        /[“”]/g,
        '"'
      )

      .replace(
        /['’‘`´]/g,
        ""
      )

      .replace(
        /[.!?,;:]+$/g,
        ""
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim()
  );

}


/* =========================================================
   CONFERIR RESPOSTA
   ========================================================= */

function check(){

  if(
    locked
  ){

    return;

  }


  if(

    cleanAnswer(
      E.answer.value
    )

    ===

    cleanAnswer(
      current()
    )

    &&

    E.answer.value.trim()

  ){

    locked=true;


    E.feedback.textContent=
      "✅ Certo!";


    moveTimer=
      setTimeout(
        next,
        160
      );

  }

}


/* =========================================================
   PRÓXIMO
   ========================================================= */

function next(){

  clear();


  let l=
    currentLevel();


  let m=
    active();


  m.progress.index=

    m.progress.index
    <
    l.items.length-1

      ?
      m.progress.index+1

      :
      0;


  save();


  show();

}


/* =========================================================
   ANTERIOR
   ========================================================= */

function prev(){

  clear();


  let l=
    currentLevel();


  let m=
    active();


  m.progress.index=

    m.progress.index>0

      ?
      m.progress.index-1

      :
      l.items.length-1;


  save();


  show();

}


/* =========================================================
   MUDAR NÍVEL
   ========================================================= */

function moveLevel(d){

  let ls=
    levels();


  let m=
    active();


  let i=
    ls.findIndex(
      x=>
        x.key===
        m.progress.level
    );


  if(
    i<0
  ){

    return;

  }


  m.progress.level=

    ls[
      (
        i+
        d+
        ls.length
      )
      %
      ls.length
    ].key;


  m.progress.index=
    0;


  renderLevel();


  save();


  show();

}


/* =========================================================
   START INTERNO
   ========================================================= */

function start(){

  sync();


  openTrain();

}


/* =========================================================
   TEMPO
   ========================================================= */

function setSecs(v){

  v=
    Math.max(
      1,
      Math.min(
        300,
        +v||3
      )
    );


  active().settings.secs=
    v;


  E.secs.value=
    v;


  E.range.value=
    v;


  save();


  if(

    practiceActive

    &&

    E.train

    &&

    !E.train
      .classList
      .contains(
        "hidden"
      )

  ){

    show();

  }

}


/* =========================================================
   EVENTOS MATERIAL
   ========================================================= */

E.matSelect.onchange=
  ()=>{

    sync();


    state.active=
      E.matSelect.value;


    loadForm();


    save();

  };


E.matName.oninput=
  sync;


E.raw.oninput=
  sync;


E.organize.onclick=
  sync;


E.start.onclick=
  start;


/* =========================================================
   NOVO MATERIAL
   ========================================================= */

E.newMat.onclick=
  ()=>{

    let m=
      fresh(
        "Material "+
        (
          state.materials.length+1
        )
      );


    state.materials.push(
      m
    );


    state.active=
      m.id;


    save();


    loadForm();

  };


/* =========================================================
   EXCLUIR MATERIAL
   ========================================================= */

E.delMat.onclick=
  ()=>{

    let m=
      active();


    if(
      !confirm(
        "Excluir “"+
        m.name+
        "”?"
      )
    ){

      return;

    }


    if(
      state.materials.length===1
    ){

      let n=
        fresh();


      state.materials=
        [n];


      state.active=
        n.id;

    }

    else{

      state.materials=

        state.materials.filter(
          x=>
            x.id!==
            m.id
        );


      state.active=
        state.materials[0].id;

    }


    save();


    loadForm();

  };


/* =========================================================
   MATERIAL
   ========================================================= */

if(
  E.back
){

  E.back.onclick=
    openMaterial;

}


/* =========================================================
   VOLTAR DO MATERIAL
   ========================================================= */

if(
  E.materialBackToTrain
){

  E.materialBackToTrain.onclick=
    openTrain;

}


/* =========================================================
   ABRIR CONFIGURAÇÕES
   ========================================================= */

if(
  E.openSettings
){

  E.openSettings.onclick=
    openSettingsPage;

}


/* =========================================================
   VOLTAR DAS CONFIGURAÇÕES
   ========================================================= */

if(
  E.settingsBackToTrain
){

  E.settingsBackToTrain.onclick=
    openTrain;

}


/* =========================================================
   COMPATIBILIDADE MENU ANTIGO
   ========================================================= */

if(
  E.menu
){

  E.menu.onclick=
    openSettingsPage;

}


if(
  E.closeMenu
){

  E.closeMenu.onclick=
    openTrain;

}


/* =========================================================
   BOTÃO COMEÇAR
   ========================================================= */

if(
  E.practiceStartBtn
){

  E.practiceStartBtn.onclick=
    beginPractice;

}


/* =========================================================
   NÍVEL
   ========================================================= */

E.level.onchange=
  ()=>{

    active().progress.level=
      E.level.value;


    active().progress.index=
      0;


    save();


    practiceActive=
      false;

  };


/* =========================================================
   TEMPO INPUT
   ========================================================= */

E.secs.onchange=
  e=>
    setSecs(
      e.target.value
    );


E.range.oninput=
  e=>
    E.secs.value=
      e.target.value;


E.range.onchange=
  e=>
    setSecs(
      e.target.value
    );


/* =========================================================
   BOTÕES DE TEMPO
   ========================================================= */

document

  .querySelectorAll(
    "[data-s]"
  )

  .forEach(
    b=>

      b.onclick=
        ()=>

          setSecs(
            b.dataset.s
          )

  );


/* =========================================================
   DIMINUIR LETRA
   ========================================================= */

E.smaller.onclick=
  ()=>{

    active().settings.font=

      Math.max(
        -50,
        active().settings.font-4
      );


    save();


    if(

      practiceActive

      &&

      E.train

      &&

      !E.train
        .classList
        .contains(
          "hidden"
        )

    ){

      show();

    }

  };


/* =========================================================
   TAMANHO AUTOMÁTICO
   ========================================================= */

E.autoFont.onclick=
  ()=>{

    active().settings.font=
      0;


    save();


    if(

      practiceActive

      &&

      E.train

      &&

      !E.train
        .classList
        .contains(
          "hidden"
        )

    ){

      show();

    }

  };


/* =========================================================
   AUMENTAR LETRA
   ========================================================= */

E.bigger.onclick=
  ()=>{

    active().settings.font=

      Math.min(
        50,
        active().settings.font+4
      );


    save();


    if(

      practiceActive

      &&

      E.train

      &&

      !E.train
        .classList
        .contains(
          "hidden"
        )

    ){

      show();

    }

  };


/* =========================================================
   RESPOSTA
   ========================================================= */

E.answer.oninput=
  check;


/* =========================================================
   ANTERIOR
   ========================================================= */

E.prev.onclick=
  prev;


/* =========================================================
   PRÓXIMO
   ========================================================= */

E.next.onclick=
  next;


/* =========================================================
   MOSTRAR NOVAMENTE
   ========================================================= */

E.replay.onclick=
  show;


/* =========================================================
   NÍVEL ANTERIOR
   ========================================================= */

E.prevLevel.onclick=
  ()=>
    moveLevel(
      -1
    );


/* =========================================================
   PRÓXIMO NÍVEL
   ========================================================= */

E.nextLevel.onclick=
  ()=>
    moveLevel(
      1
    );


/* =========================================================
   PAUSAR
   ========================================================= */

E.pause.onclick=
  ()=>{

    if(
      paused
    ){

      show();

    }

    else{

      paused=true;


      clear();


      E.pause.textContent=
        "▶ Continuar";


      E.clock.textContent=
        "pausado";

    }

  };


/* =========================================================
   SALVAR AO SAIR
   ========================================================= */

window.addEventListener(
  "pagehide",
  save
);


/* =========================================================
   SALVAR QUANDO OCULTA
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  ()=>{

    if(
      document.hidden
    ){

      save();

    }

  }
);


/* =========================================================
   INICIAR MATERIAL
   ========================================================= */

loadForm();


/* =========================================================
   PREPARAR TELAS
   ========================================================= */

if(
  E.train
){

  E.train.classList.add(
    "hidden"
  );

}


if(
  E.settingsPage
){

  E.settingsPage.classList.add(
    "hidden"
  );

}


})();
