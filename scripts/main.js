(()=>{
  const LOCALE_KEY = 'site-locale';
  const DEFAULT_LOCALE = 'ru';
  const SUPPORTED = ['ru','uk'];

  function resolveLocale(){
    const stored = localStorage.getItem(LOCALE_KEY);
    if(stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language||'').toLowerCase();
    for(const l of SUPPORTED){ if(nav.startsWith(l)) return l; }
    return DEFAULT_LOCALE;
  }

  let currentLocale = resolveLocale();
  let dict = {};

  function setHtmlLang(loc){
    document.documentElement.lang = loc;
    const og = document.getElementById('ogLocale');
    if(og) og.content = loc === 'uk' ? 'uk_UA' : 'ru_RU';
  }

  function applyMeta(d){
    const m = (id,val)=>{ const el=document.getElementById(id); if(el) el[el.hasAttribute('content')?'content':'textContent']=val; };
    if(d['meta.title']) m('pageTitle', d['meta.title']);
    if(d['meta.desc']) m('metaDesc', d['meta.desc']);
    if(d['meta.ogTitle']) m('ogTitle', d['meta.ogTitle']);
    if(d['meta.ogDesc']) m('ogDesc', d['meta.ogDesc']);
    if(d['meta.ogImgAlt']) m('ogImgAlt', d['meta.ogImgAlt']);
    if(d['meta.twTitle']) m('twTitle', d['meta.twTitle']);
    if(d['meta.twDesc']) m('twDesc', d['meta.twDesc']);
    if(d['meta.ldName']){
      const ld = document.getElementById('ldJson');
      if(ld){
        try{
          const data = JSON.parse(ld.textContent);
          const g = data['@graph'];
          if(g){
            const p = g.find(x=>x['@type']==='Person');
            if(p){
              if(d['meta.ldName']) p.name = d['meta.ldName'];
              if(d['meta.ldJobTitle']) p.jobTitle = d['meta.ldJobTitle'];
              if(d['meta.ldDesc']) p.description = d['meta.ldDesc'];
              p.knowsLanguage = [currentLocale];
            }
            const s = g.find(x=>x['@type']==='ProfessionalService');
            if(s){
              if(d['meta.ldSvcName']) s.name = d['meta.ldSvcName'];
              if(d['meta.ldSvcDesc']) s.description = d['meta.ldSvcDesc'];
              if(d['meta.ldSvcType']) s.serviceType = d['meta.ldSvcType'];
              s.availableLanguage = [currentLocale];
            }
          }
          ld.textContent = JSON.stringify(data);
        }catch(e){}
      }
    }
  }

  function applyTranslations(d){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(!key || !d[key]) return;
      if(key.includes('h1') || key.includes('h2') || key.includes('footer.copy') || key.includes('faq.a') || key.includes('about.h2')){
        el.innerHTML = d[key];
      }else{
        el.textContent = d[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      if(key && d[key]) el.placeholder = d[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
      const key = el.getAttribute('data-i18n-aria');
      if(key && d[key]) el.setAttribute('aria-label', d[key]);
    });
    applyMeta(d);
  }

  async function loadLocale(loc){
    try{
      const resp = await fetch(`i18n/${loc}.json`);
      if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
      dict = await resp.json();
      currentLocale = loc;
      localStorage.setItem(LOCALE_KEY, loc);
      setHtmlLang(loc);
      applyTranslations(dict);
      updateSwitcherUI();
    }catch(e){
      console.warn('i18n load failed, fallback to default', e);
      if(loc !== DEFAULT_LOCALE){
        await loadLocale(DEFAULT_LOCALE);
      }
    }
  }

  function updateSwitcherUI(){
    document.querySelectorAll('.lang-switcher button').forEach(btn=>{
      const l = btn.getAttribute('data-lang');
      btn.classList.toggle('active', l === currentLocale);
      btn.setAttribute('aria-pressed', l === currentLocale ? 'true' : 'false');
    });
  }

  /* ---- INIT ---- */
  setHtmlLang(currentLocale);
  loadLocale(currentLocale).then(()=>{
    document.documentElement.style.visibility = 'visible';
  });

  /* ---- LANG SWITCHER ---- */
  document.querySelectorAll('.lang-switcher button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const loc = btn.getAttribute('data-lang');
      if(loc && SUPPORTED.includes(loc) && loc !== currentLocale){
        loadLocale(loc);
      }
    });
  });

  /* ---- BURGER MENU ---- */
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  if(burger && navLinks){
    burger.addEventListener('click',()=>{
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });
    navLinks.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>{
        burger.setAttribute('aria-expanded','false');
        navLinks.classList.remove('open');
        document.body.classList.remove('menu-open');
      });
    });
    document.addEventListener('click',(e)=>{
      if(!burger.contains(e.target) && !navLinks.contains(e.target)){
        burger.setAttribute('aria-expanded','false');
        navLinks.classList.remove('open');
        document.body.classList.remove('menu-open');
      }
    });
  }

  /* ---- FAQ ACCORDION ---- */
  document.querySelectorAll('.faq-q').forEach(q=>{
    q.addEventListener('click',()=>{
      const item = q.closest('.faq-item');
      const expanded = q.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-q').forEach(o=>o.setAttribute('aria-expanded','false'));
      document.querySelectorAll('.faq-item').forEach(o=>o.classList.remove('open'));
      if(!expanded){
        q.setAttribute('aria-expanded','true');
        item.classList.add('open');
      }
    });
  });

  /* ---- DIPLOMA MODAL ---- */
  let diplomaCards = [];
  let currentDiplomaIndex = -1;
  
  function collectDiplomaCards(){
    diplomaCards = Array.from(document.querySelectorAll('.diploma-card img')).map(img => img.src);
  }
  collectDiplomaCards();
  
  function openDiploma(imgSrc){
    const overlay = document.getElementById('diplomaOverlay');
    const img = document.getElementById('diplomaImg');
    if(!overlay || !img) return;
    img.src = imgSrc;
    img.alt = dict['education.diploma'] || 'Диплом';
    currentDiplomaIndex = diplomaCards.indexOf(imgSrc);
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    updateDiplomaNavButtons();
  }
  function closeDiploma(){
    const overlay = document.getElementById('diplomaOverlay');
    if(!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
  function navigateDiploma(delta){
    if(diplomaCards.length === 0 || currentDiplomaIndex < 0) return;
    const newIndex = currentDiplomaIndex + delta;
    if(newIndex < 0 || newIndex >= diplomaCards.length) return;
    const img = document.getElementById('diplomaImg');
    if(img){
      img.src = diplomaCards[newIndex];
      currentDiplomaIndex = newIndex;
      updateDiplomaNavButtons();
    }
  }
  function updateDiplomaNavButtons(){
    const prevBtn = document.getElementById('diplomaPrev');
    const nextBtn = document.getElementById('diplomaNext');
    if(prevBtn) prevBtn.style.visibility = currentDiplomaIndex <= 0 ? 'hidden' : 'visible';
    if(nextBtn) nextBtn.style.visibility = currentDiplomaIndex >= diplomaCards.length - 1 ? 'hidden' : 'visible';
  }
  
  document.querySelectorAll('.diploma-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const img = card.querySelector('img');
      if(img) openDiploma(img.src);
    });
  });
  const diplomaOverlay = document.getElementById('diplomaOverlay');
  if(diplomaOverlay){
    diplomaOverlay.addEventListener('click',(e)=>{
      if(e.target === diplomaOverlay) closeDiploma();
    });
    const closeBtn = diplomaOverlay.querySelector('.diploma-modal-close');
    if(closeBtn) closeBtn.addEventListener('click', closeDiploma);
  }
  const diplomaPrev = document.getElementById('diplomaPrev');
  const diplomaNext = document.getElementById('diplomaNext');
  if(diplomaPrev) diplomaPrev.addEventListener('click', (e)=>{ e.stopPropagation(); navigateDiploma(-1); });
  if(diplomaNext) diplomaNext.addEventListener('click', (e)=>{ e.stopPropagation(); navigateDiploma(1); });
  
  document.addEventListener('keydown',(e)=>{
    if(e.key === 'Escape') closeDiploma();
    if(document.getElementById('diplomaOverlay')?.classList.contains('open')){
      if(e.key === 'ArrowLeft') navigateDiploma(-1);
      if(e.key === 'ArrowRight') navigateDiploma(1);
    }
  });

  /* ---- SLIDER ---- */
  (function(){
    const wrap = document.querySelector('.voices-wrap');
    const items = document.querySelectorAll('.voices-wrap > *');
    if(!wrap || items.length===0) return;
    let idx = 0;
    const total = items.length;
    const nextBtn = document.getElementById('voicesNext');
    const prevBtn = document.getElementById('voicesPrev');
    const countEl = document.getElementById('voicesCount');

    function updateSlider(){
      const gap = parseFloat(getComputedStyle(wrap).gap) || 0;
      const itemWidth = items[0]?.offsetWidth || 0;
      const offset = idx * (itemWidth + gap);
      wrap.style.transform = `translateX(-${offset}px)`;
      if(nextBtn) nextBtn.disabled = idx >= total - 1;
      if(prevBtn) prevBtn.disabled = idx <= 0;
      if(countEl) countEl.textContent = `${idx+1}/${total}`;
    }
    function goTo(i){
      idx = Math.max(0, Math.min(i, total-1));
      updateSlider();
    }
    nextBtn?.addEventListener('click',()=>goTo(idx+1));
    prevBtn?.addEventListener('click',()=>goTo(idx-1));
    let touchStartX = 0;
    wrap.addEventListener('touchstart',(e)=>{ touchStartX = e.touches[0].clientX; },{passive:true});
    wrap.addEventListener('touchend',(e)=>{
      const diff = touchStartX - e.changedTouches[0].clientX;
      if(Math.abs(diff)>40) goTo(diff>0 ? idx+1 : idx-1);
    });
    updateSlider();
    window.addEventListener('resize', updateSlider);
    const observer = new ResizeObserver(updateSlider);
    items.forEach(item=>observer.observe(item));
  })();

  /* ---- HOW IT WORKS TOGGLE ---- */
  const howBtn = document.getElementById('howItWorksBtn');
  const howDesc = document.getElementById('howItWorksDesc');
  if(howBtn && howDesc){
    howBtn.addEventListener('click',()=>{
      const open = howDesc.classList.toggle('open');
      howBtn.setAttribute('aria-expanded', open?'true':'false');
    });
  }

  /* ---- LAZY LOADING ---- */
  if('IntersectionObserver' in window){
    const ll = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const el = e.target;
          if(el.dataset.src) el.src = el.dataset.src;
          if(el.dataset.srcset) el.srcset = el.dataset.srcset;
          ll.unobserve(el);
        }
      });
    },{rootMargin:'200px'});
    document.querySelectorAll('[loading="lazy"]').forEach(el=>ll.observe(el));
  }

  /* ---- SMOOTH SCROLL for hash links (already handled by CSS, but ensure) ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      const href = this.getAttribute('href');
      if(!href || href==='#') return;
      const target = document.querySelector(href);
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth'});
      }
    });
  });

})();