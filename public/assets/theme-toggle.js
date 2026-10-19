(function(){
  const KEY='clicaThemeV1';
  const root=document.documentElement;
  function apply(theme){
    root.dataset.theme=theme;
    const btn=document.getElementById('themeToggle');
    if(btn){
      const dark=theme==='dark';
      btn.setAttribute('aria-pressed',dark?'true':'false');
      btn.querySelector('.theme-toggle-label').textContent=dark?'Modo claro':'Modo escuro';
      btn.setAttribute('aria-label',dark?'Ativar modo claro':'Ativar modo escuro');
      btn.title=dark?'Ativar modo claro':'Ativar modo escuro';
    }
  }
  let saved='light';
  try{saved=localStorage.getItem(KEY)||'light'}catch(e){}
  apply(saved==='dark'?'dark':'light');
  document.addEventListener('DOMContentLoaded',function(){
    if(document.getElementById('themeToggle'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='themeToggle';
    btn.className='theme-toggle';
    btn.innerHTML='<span class="theme-toggle-dot" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
    btn.addEventListener('click',function(){
      const next=root.dataset.theme==='dark'?'light':'dark';
      try{localStorage.setItem(KEY,next)}catch(e){}
      apply(next);
    });
    document.body.appendChild(btn);
    apply(root.dataset.theme||'light');
  });
})();