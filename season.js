(()=>{
  if(typeof i18n==='undefined'||typeof applyLang!=='function') return;
  Object.assign(i18n.fr,{
    navSeason:'La saison',
    seasonEyebrow:'LA SAISON QUI N’A JAMAIS ÉTÉ RÉCOMPENSÉE',
    seasonTitle:'2019/20. <span class="gold">Une saison de Ballon d’Or.</span>',
    seasonLead:'Les chiffres étaient historiques. Les trophées étaient là. Les autres grandes récompenses individuelles aussi. Voici la saison qui est restée sans Ballon d’Or.',
    seasonHeroStat:'buts en 47 matchs avec le Bayern',
    statLeague:'buts · 31 matchs de Bundesliga',statUcl:'buts · 10 matchs de Ligue des champions',statCup:'buts · 5 matchs de Coupe d’Allemagne',statTopScorer:'meilleur buteur des trois compétitions remportées',statTreble:'trophées · Bundesliga + Coupe + C1',statUefaVotes:'points au vote UEFA Joueur de l’année',
    tl1t:'Hat-trick à Schalke.',tl1b:'Trois buts, dont un coup franc, dès la deuxième journée de Bundesliga.',tl2t:'4 buts en 16 minutes en C1.',tl2b:'Face à l’Étoile rouge, il signe alors le quadruplé le plus rapide de l’histoire de la compétition.',tl3t:'Doublé en finale de Coupe.',tl3b:'Deux buts contre Leverkusen pour sceller le doublé national.',tl4t:'Champion d’Europe.',tl4b:'Le Bayern bat Paris à Lisbonne. Lewandowski termine la C1 meilleur buteur avec 15 buts.',
    officialUefa:'VIDÉO OFFICIELLE UEFA',officialBayern:'VIDÉO / ARCHIVE FC BAYERN',video1:'Les 15 buts de Lewandowski en C1 2019/20',video2:'Lewandowski, Joueur UEFA de l’année 2019/20',video3:'Pourquoi Lewandowski était le meilleur joueur du monde en 2020',watchVideo:'Regarder la vidéo ↗',seasonCtaEyebrow:'55 BUTS · TRIPLÉ · MEILLEUR JOUEUR UEFA · THE BEST FIFA',seasonCtaTitle:'Une saison comme celle-ci méritait son Ballon d’Or.',seasonCtaButton:'JE SIGNE POUR LEWY 2020',mediaCredit:'Crédits photo :'
  });
  Object.assign(i18n.en,{
    navSeason:'The season',seasonEyebrow:'THE SEASON THAT WAS NEVER REWARDED',seasonTitle:'2019/20. <span class="gold">A Ballon d’Or season.</span>',seasonLead:'Historic numbers. Every major trophy. Recognition from football’s other major awards. This is the season that ended without a Ballon d’Or.',seasonHeroStat:'goals in 47 Bayern matches',statLeague:'goals · 31 Bundesliga matches',statUcl:'goals · 10 Champions League matches',statCup:'goals · 5 German Cup matches',statTopScorer:'top scorer in all three competitions Bayern won',statTreble:'trophies · Bundesliga + Cup + UCL',statUefaVotes:'points in the UEFA Player of the Year vote',tl1t:'Hat-trick at Schalke.',tl1b:'Three goals, including a free-kick, on Bundesliga matchday two.',tl2t:'4 goals in 16 minutes in Europe.',tl2b:'Against Crvena zvezda, he produced what was then the fastest four-goal haul in Champions League history.',tl3t:'Cup-final brace.',tl3b:'Two goals against Leverkusen sealed the domestic double.',tl4t:'European champion.',tl4b:'Bayern beat Paris in Lisbon. Lewandowski finished the Champions League as top scorer with 15 goals.',officialUefa:'OFFICIAL UEFA VIDEO',officialBayern:'FC BAYERN VIDEO / ARCHIVE',video1:'All 15 Lewandowski goals in the 2019/20 UCL',video2:'Lewandowski — UEFA Player of the Year 2019/20',video3:'Why Lewandowski was the best player in the world in 2020',watchVideo:'Watch ↗',seasonCtaEyebrow:'55 GOALS · TREBLE · UEFA PLAYER OF THE YEAR · THE BEST FIFA',seasonCtaTitle:'A season like this deserved its Ballon d’Or.',seasonCtaButton:'SIGN FOR LEWY 2020',mediaCredit:'Photo credits:'
  });
  applyLang();
  const css=document.createElement('link');css.rel='stylesheet';css.href='/launch.css';document.head.appendChild(css);
  const js=document.createElement('script');js.src='/launch.js';js.async=false;document.head.appendChild(js);
})();
