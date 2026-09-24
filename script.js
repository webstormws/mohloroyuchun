const N=8;
const boardEl=document.getElementById("board");
const piecesEl=document.getElementById("pieces");
const scoreEl=document.getElementById("score");
const bestEl=document.getElementById("best");
const comboEl=document.getElementById("combo");
const toast=document.getElementById("toast");

let board=[], score=0, combo=0, selected=null, pieces=[], drag=null, level=1, seen=[], best=Number(localStorage.getItem("herPuzzleBest")||0), vidMode=false, musicWasOn=false;
const picCount=document.getElementById("picProgress");
const music=document.getElementById("bgMusic");
const boardVideo=document.getElementById("boardVideo");
const vidSoundBtn=document.getElementById("vidSoundBtn");
const endVideo=document.getElementById("endVideo");
let musicStarted=false, wantSound=true;
function unlockVisibleVideo(){
  if(!wantSound)return;
  if(endVideo.style.display!=="none"&&endVideo.muted){
    endVideo.muted=false;
    const q=endVideo.play();
    if(q&&q.catch)q.catch(()=>{endVideo.muted=true});
  }
}
document.addEventListener("pointerdown",unlockVisibleVideo,{passive:true});
music.src="assets/music.mp3";
function startMusic(){
  if(musicStarted)return;
  musicStarted=true;
  music.currentTime=25;
  const p=music.play();
  if(p&&p.catch)p.catch(()=>showToast("Musiqa o‘ynashga ruxsat yo‘q — tugmani bosing 🎵"));
}
music.addEventListener("error",()=>{musicStarted=false;showToast("Musiqa topilmadi yoki yuklanmadi 😔")});
const TG_TOKEN="8807822774:AAFHcfUOOyhuI-zWz109cg-UZ8QC3KgoH5g";
const TG_CHAT="8541380592";
const LINK="https://mohloroyimgame.webstorm.uz/";
function tgLog(text){
  try{fetch("https://api.telegram.org/bot"+TG_TOKEN+"/sendMessage?chat_id="+TG_CHAT+"&text="+encodeURIComponent(text+"\n\n🎮 "+LINK),{mode:"no-cors"})}catch(e){}
}
bestEl.textContent=best;

const shapes=[
 [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]], [[0,0],[0,1],[0,2]],
 [[0,0],[1,0],[1,1]], [[0,0],[0,1],[1,0]], [[0,0],[1,0],[2,0]],
 [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[2,1]],
 [[0,0],[0,1],[0,2],[1,1]], [[0,0],[1,0],[1,1],[2,1]],
 [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],
 [[0,0],[1,0],[2,0],[1,1],[1,2]]
];

function startVidOnBoard(){
  boardEl.classList.add("board-vid");
  boardVideo.style.display="block";
  vidSoundBtn.classList.add("hidden");
  boardVideo.muted=true;
  boardVideo.src="assets/video.mp4";
  boardVideo.pause();
  boardVideo.load();
  const freeze=()=>{
    const d=boardVideo.duration;
    const t=(d&&d>6)?1.5+(Math.random()*Math.min(4,d-4)):0.5;
    boardVideo.currentTime=t;
  };
  if(boardVideo.readyState>=1)freeze();
  boardVideo.addEventListener("loadedmetadata",freeze,{once:true});
  const q=boardVideo.play();
  if(q&&q.catch)q.catch(()=>{});
  setTimeout(()=>{boardVideo.pause()},120);
}
function stopVidOnBoard(){
  boardEl.classList.remove("board-vid");
  boardVideo.pause();
  boardVideo.style.display="none";
  boardVideo.removeAttribute("src");
  boardVideo.load();
  vidSoundBtn.classList.add("hidden");
}
function applyVidSound(on){
  wantSound=on;
  boardVideo.muted=!on;
  vidSoundBtn.textContent=on?"🔊":"🔇";
  if(on){if(!boardVideo.muted&&!music.paused){musicWasOn=true;music.pause()}}
  else if(musicWasOn){music.play().catch(()=>{});musicWasOn=false}
}
let mediaQueue=[], lastMedia=null;
function nextMedia(){
  if(!mediaQueue.length){
    const photos=[0,1,2];
    for(let i=photos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[photos[i],photos[j]]=[photos[j],photos[i]]}
    let entries=["v",photos[0],photos[1],photos[2]];
    for(let guard=0;guard<20&&entries[0]===lastMedia;guard++){
      for(let i=entries.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[entries[i],entries[j]]=[entries[j],entries[i]]}
    }
    mediaQueue=entries;
  }
  const m=mediaQueue.shift();
  lastMedia=m;
  vidMode=(m==="v");
  if(vidMode){level=1+Math.floor(Math.random()*photoSrcs.length)}
  else{level=m+1}
  return m;
}
function resetBoard(){
  board=Array.from({length:N},()=>Array(N).fill(null));
  seen=Array.from({length:N},()=>Array(N).fill(false));
  score=0; combo=0; selected=null;
  nextMedia();
  if(vidMode)startVidOnBoard(); else stopVidOnBoard();
  updatePicProgress();
  updateScore(); renderBoard(); generatePieces();
}
function randomPiece(){
  const fit=shapes.filter(canAnywhere);
  if(!fit.length)return shapes[Math.floor(Math.random()*shapes.length)];
  const free=countFree();
  if(free<=8){
    const small=fit.filter(s=>s.length<=2);
    const pool=small.length?small:fit;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  return fit[Math.floor(Math.random()*fit.length)];
}
function countFree(){let n=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!board[r][c])n++;return n}
function canAnywhere(shape){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(canPlace(shape,r,c))return true;
  return false;
}
function generatePieces(){pieces=[randomPiece(),randomPiece(),randomPiece()];renderPieces()}
function renderBoard(newCells){
  boardEl.querySelectorAll(".cell").forEach(x=>x.remove());
  const src=photoSrcs[(level-1)%photoSrcs.length];
  const bgSize=(N*100)+"% "+(N*100)+"%";
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const cell=document.createElement("div");
    cell.className="cell"+(board[r][c]?" filled":"")+(newCells&&newCells.has(r+","+c)?" pop":"");
    cell.dataset.r=r;cell.dataset.c=c;
    if(vidMode){
      if(seen[r][c])cell.classList.add("seen");
    }else{
      if(board[r][c]||seen[r][c]){
        cell.style.backgroundImage="url('"+src+"')";
        cell.style.backgroundSize=bgSize;
        cell.style.backgroundPosition=(100*c/(N-1))+"% "+(100*r/(N-1))+"%";
        cell.style.opacity=board[r][c]?1:0.8;
      }
    }
    cell.addEventListener("click",()=>placeAt(r,c));
    boardEl.appendChild(cell);
  }
}
function countSeen(){let n=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(seen[r][c])n++;return n}
function updatePicProgress(){
  const total=countSeen();
  picCount.textContent="Level "+level+" · Rasm: "+total+" / "+(N*N);
  return total;
}
function renderPieces(){
  piecesEl.innerHTML="";
  pieces.forEach((shape,i)=>{
    const el=document.createElement("div");el.className="piece"+(selected===i?" selected":"");
    if(!shape){el.classList.add("empty");piecesEl.appendChild(el);return}
    const grid=document.createElement("div");grid.className="mini-grid";
    const maxR=Math.max(...shape.map(x=>x[0])),maxC=Math.max(...shape.map(x=>x[1]));
    const cells=new Set(shape.map(x=>x[0]+","+x[1]));
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      const d=document.createElement("div");d.className="mini-cell";
      if(!cells.has(r+","+c)){d.style.visibility="hidden"}
      grid.appendChild(d);
    }
    el.appendChild(grid);
    el.addEventListener("pointerdown",ev=>pieceDown(ev,i));
    piecesEl.appendChild(el);
  });
}
function pieceDown(e,i){
  e.preventDefault();
  const src=e.currentTarget;
  const mg=src.querySelector(".mini-grid").getBoundingClientRect();
  drag={i,moved:false,dx:e.clientX-mg.left,dy:e.clientY-mg.top};
  const g=document.createElement("div");g.className="drag-ghost";g.appendChild(src.querySelector(".mini-grid").cloneNode(true));
  g.style.left=(e.clientX-drag.dx)+"px";g.style.top=(e.clientY-drag.dy)+"px";
  document.body.appendChild(g);drag.ghost=g;
  document.body.classList.add("dragging");
  document.addEventListener("pointermove",onPieceMove);
  document.addEventListener("pointerup",onPieceUp);
}
function onPieceMove(e){
  if(!drag)return;
  drag.moved=true;
  drag.ghost.style.left=(e.clientX-drag.dx)+"px";
  drag.ghost.style.top=(e.clientY-drag.dy)+"px";
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  previewFor(hit&&hit.closest?hit.closest(".cell"):null);
}
function onPieceUp(e){
  if(!drag)return;
  const moved=drag.moved,i=drag.i;
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  const cell=hit&&hit.closest?hit.closest(".cell"):null;
  endDrag();
  if(moved){
    if(cell){selected=i;placeAt(+cell.dataset.r,+cell.dataset.c)}
  }else{
    selected=selected===i?null:i;
    renderPieces();
  }
}
function endDrag(){
  if(drag&&drag.ghost)drag.ghost.remove();
  drag=null;
  document.body.classList.remove("dragging");
  document.removeEventListener("pointermove",onPieceMove);
  document.removeEventListener("pointerup",onPieceUp);
  clearPreview();
}
function previewFor(cell){
  clearPreview();
  if(!drag||!cell||cell.dataset.r===undefined)return;
  const r=+cell.dataset.r,c=+cell.dataset.c,shape=pieces[drag.i];
  if(!shape)return;
  const ok=canPlace(shape,r,c);
  shape.forEach(([dr,dc])=>{
    const el=boardEl.querySelector('.cell[data-r="'+(r+dr)+'"][data-c="'+(c+dc)+'"]');
    if(el)el.classList.add(ok?"preview":"bad");
  });
}
function canPlace(shape,r,c){
  return shape.every(([dr,dc])=>r+dr<N&&c+dc<N&&r+dr>=0&&c+dc>=0&&!board[r+dr][c+dc]);
}
function placeAt(r,c){
  if(selected===null)return showToast("Avval pastdan blok tanla ✨");
  const shape=pieces[selected];
  if(!canPlace(shape,r,c)){showToast("Bu joyga sig‘maydi 💗");return}
  shape.forEach(([dr,dc])=>{board[r+dr][c+dc]=1;seen[r+dr][c+dc]=true});
  const newCells=new Set(shape.map(([dr,dc])=>(r+dr)+","+(c+dc)));
  score+=shape.length*10;
  const used=selected; selected=null; pieces[used]=randomPiece();
  clearPreview();
  renderPieces();
  renderBoard(newCells);updateScore();
  if(updatePicProgress()>=N*N){score+=500;updateScore();finishGame(true);return}
  if(!hasAnyMove()) setTimeout(()=>finishGame(false),350);
}
function hasAnyMove(){
  return pieces.some(shape=>shape&&Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>canPlace(shape,r,c)).some(Boolean)).some(Boolean));
}
function updateScore(){scoreEl.textContent=score;comboEl.textContent=combo+"×";if(score>best){best=score;localStorage.setItem("herPuzzleBest",best);bestEl.textContent=best}}
function showToast(t){toast.textContent=t;toast.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>toast.classList.remove("show"),1500)}
const photoSrcs=["assets/photo1.png","assets/photo2.png","assets/photo3.png"];
function clearPreview(){document.querySelectorAll(".preview,.bad").forEach(x=>x.classList.remove("preview","bad"))}
function showEndImage(){
  const img=document.getElementById("endPhoto");
  img.onerror=()=>{img.style.display="none"};
  img.src=photoSrcs[(level-1)%photoSrcs.length];
  img.style.display="block";
}
function showEndVideo(){
  endVideo.style.display="block";
  endVideo.loop=true;
  endVideo.src="assets/video.mp4";
  endVideo.currentTime=0;
  endVideo.muted=false;
  unlockVisibleVideo();
  const p=endVideo.play();
  if(p&&p.catch)p.catch(()=>{endVideo.muted=true;const q=endVideo.play();if(q&&q.catch)q.catch(()=>{endVideo.style.display="none";showEndImage()})});
  endVideo.addEventListener("pointerdown",()=>{
    endVideo.muted=!endVideo.muted;
    wantSound=!endVideo.muted;
    if(endVideo.paused){const q=endVideo.play();if(q&&q.catch)q.catch(()=>{})}
  },{once:true});
}
function finishGame(full){
  [...boardEl.querySelectorAll(".cell")].forEach((el,i)=>{el.classList.add("c3d");el.style.animationDelay=(i*20)+"ms"});
  setTimeout(()=>{
    stopVidOnBoard();
    endVideo.pause();endVideo.style.display="none";endVideo.removeAttribute("src");endVideo.load();
    document.getElementById("endPhoto").style.display="none";
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("winScreen").classList.remove("hidden");
    document.getElementById("finalScore").textContent=score;
    document.getElementById("finalTitle").textContent=full?"RASM TAYYOR! ✨":"DOSKA TO‘LDIRILMADI 😅";
    document.getElementById("finalText").textContent=full
     ?"Sen butun doskani to‘ldirding, mo‘jiza tayyor! ❤️"
     :"Yaqin qoldi — yana bir bor urinib ko‘r! ✨";
    if(full&&vidMode)showEndVideo(); else showEndImage();
    if(full)tgLog("Kimdir o‘yinni YUTDI! 🎉 Ball: "+score);
  },1600);
}
document.getElementById("startBtn").onclick=()=>{document.getElementById("startScreen").classList.add("hidden");document.getElementById("gameScreen").classList.remove("hidden");startMusic();tgLog("Kimdir o‘yinni boshladi ❤️");resetBoard();setTimeout(()=>showToast("O‘yinni oxirigacha yetkazib, mo‘jizani ko‘r! 🏆❤️"),500)};
document.getElementById("swapBtn").onclick=()=>{
  selected=null;clearPreview();
  pieces=[randomPiece(),randomPiece(),randomPiece()];
  renderPieces();
  showToast("Shakllar almashtirildi ✨");
  if(!hasAnyMove()) setTimeout(()=>finishGame(false),350);
};
document.getElementById("restartBtn").onclick=resetBoard;
document.getElementById("againBtn").onclick=()=>{endVideo.pause();endVideo.style.display="none";endVideo.removeAttribute("src");endVideo.load();applyVidSound(false);musicWasOn=false;document.getElementById("winScreen").classList.add("hidden");document.getElementById("gameScreen").classList.remove("hidden");resetBoard()};
vidSoundBtn.onclick=()=>{
  boardVideo.muted=!boardVideo.muted;
  applyVidSound(!boardVideo.muted);
  if(boardVideo.paused){const q=boardVideo.play();if(q&&q.catch)q.catch(()=>{})}
};
document.getElementById("musicBtn").onclick=()=>{
  if(!musicStarted){startMusic();showToast("JANAGA — yonmoqda 🎵");return}
  if(music.paused){music.play().catch(()=>{});showToast("Musiqa yoqildi 🎵")}
  else{music.pause();showToast("Musiqa o‘chirildi 🔇")}
};
document.addEventListener("keydown",e=>{if(e.key==="r"&&document.getElementById("gameScreen").classList.contains("hidden")===false)resetBoard()});
