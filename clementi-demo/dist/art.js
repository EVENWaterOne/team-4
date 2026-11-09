(function () {
  'use strict';
  const C = { ink:'#253143', edge:'#354055', cream:'#fff0ce', gold:'#efb44d', peach:'#f5c087', clay:'#c77356', wall:'#e6be8c', darkwall:'#a98264', roof:'#575d68', teal:'#4a8d8b', leaf:'#467551', leaflit:'#9aaf62', red:'#ba6658', ground:'#aa9879' };
  const facilityNames = { club:'Community Club', smart:'Smart Community Hub', hawker:'Hawker Centre', walkway:'Covered Walkway', bus:'Bus Stop', roof:'Rooftop Garden', solar:'Solar Panels', rain:'Rain Garden', childcare:'Childcare Centre', daycare:'Day Centre', feedback:'Feedback Kiosk', cleanup:'Clean-up Drive', rest:'Rest Shelter', canteen:'Affordable Canteen', blank:'Open Space', register:'Registration Visits', flexible:'Flexible Quota', soundproof:'Soundproofing', retrofit:'Energy Upgrade' };
  const residentNames = { chen:'Mdm Chen', lin:'The Lin Family', aisyah:'Aisyah’s Family', mei:'Mei’s Family', kumar:'Kumar & Friends' };
  const photoNames = { chess:'The Chess Corner', skate:'Weekend Skateboarding', feast:'The Hari Raya Table', door:'The First Knock Next Door', shade:'Shade at Lunchtime' };
  const r = (x,y,w,h,c,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${extra}/>`;
  const p = (pts,c,stroke=C.ink,width=2) => `<polygon points="${pts}" fill="${c}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="miter"/>`;
  const l = (x1,y1,x2,y2,c=C.ink,w=2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
  const svg = (content,w,h,label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${String(label).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}" style="image-rendering:pixelated" shape-rendering="crispEdges">${content}</svg>`;

  function shrub(x,y,s=1) {
    return `<g transform="translate(${x} ${y}) scale(${s})">${r(-5,-2,10,8,C.clay)}${r(-8,-8,16,8,C.ink)}${r(-8,-9,6,7,C.leaf)}${r(-4,-14,7,11,C.leaf)}${r(2,-11,6,9,C.leaflit)}${r(-6,-12,3,3,C.leaflit)}${r(-1,-15,3,3,'#ddd38a')}${r(5,-7,3,3,'#eaa156')}${r(-3,-5,2,3,'#759762')}</g>`;
  }
  function bench(x,y,s=1) {
    return `<g transform="translate(${x} ${y}) scale(${s})">${p('-12,-3 8,-9 18,-4 -2,2','#bb885b')}${p('-12,-8 8,-14 8,-9 -12,-3','#5f8474')}${l(-10,-3,-10,3)}${l(14,-4,14,3)}${l(-7,-10,7,-14,'#a3a783',1)}</g>`;
  }
  function tinyPerson(x,y,color='#be7860',skin='#e7b280',s=1) {
    return `<g transform="translate(${x} ${y}) scale(${s})">${r(-3,-18,6,4,C.ink)}${r(-3,-14,6,6,skin)}${r(-4,-8,8,10,color)}${r(-6,-6,2,7,skin)}${r(4,-6,2,7,skin)}${r(-3,2,3,7,C.ink)}${r(1,2,3,7,C.ink)}${r(-5,8,5,2,'#453e36')}${r(1,8,5,2,'#453e36')}</g>`;
  }
  function ground() {
    return p('7,88 84,58 174,93 96,127','#394550',C.ink,1)+p('7,83 84,53 174,88 96,121','#c2b18b',C.ink,2)+p('7,83 96,116 96,121 7,88','#9b886c',C.ink,1)+p('96,116 174,88 174,93 96,121','#706d61',C.ink,1)+l(37,72,127,106,'#daceaa',1)+l(68,60,158,94,'#daceaa',1)+l(31,93,107,63,'#a7987d',1)+l(60,105,137,75,'#a7987d',1);
  }
  function building({x=39,y=82,w=68,d=24,h=36,roof=C.roof,wall=C.wall,side=C.darkwall,glass=false,windows=3,roofOverhang=4}={}) {
    let out=p(`${x},${y-h} ${x+w},${y-h+26} ${x+w},${y+26} ${x},${y}`,wall)+p(`${x+w},${y-h+26} ${x+w+d},${y-h+15} ${x+w+d},${y+15} ${x+w},${y+26}`,side);
    if(glass) {
      out+=p(`${x+3},${y-h+7} ${x+w-3},${y-h+30} ${x+w-3},${y+20} ${x+3},${y-2}`,'#394d55',C.ink,1);
      for(let i=0;i<4;i++){let xx=x+9+i*(w-16)/3;out+=l(xx,y-h+9+(xx-x)*.38,xx,y-4+(xx-x)*.38,'#eed79b',3);}
      out+=p(`${x+5},${y-h+10} ${x+20},${y-h+15} ${x+20},${y-h+22} ${x+5},${y-h+16}`,'#ccbaa0',C.ink,1);
    } else {
      for(let i=0;i<windows;i++) { const xx=x+6+i*(w-9)/windows,yy=y-h+10+(xx-x)*.38;out+=p(`${xx},${yy} ${xx+11},${yy+4} ${xx+11},${yy+18} ${xx},${yy+14}`,'#e4a948',C.ink,2)+l(xx+5,yy+2,xx+5,yy+16,'#ffe4a8',1)+l(xx+1,yy+9,xx+10,yy+12,'#92563c',1); }
      out+=p(`${x+w+6},${y-h+34} ${x+w+d-4},${y-h+28} ${x+w+d-4},${y+11} ${x+w+6},${y+18}`,'#4b4d50',C.ink,1)+l(x+w+8,y-h+38,x+w+d-7,y-h+33,'#f5bf69',1);
    }
    out+=p(`${x-roofOverhang},${y-h-3} ${x+d},${y-h-15} ${x+w+d+roofOverhang},${y-h+11} ${x+w},${y-h+29}`,roof)+p(`${x-roofOverhang},${y-h-3} ${x+w},${y-h+24} ${x+w},${y-h+29} ${x-roofOverhang},${y-h+2}`,'#333a43')+l(x+3,y-h-4,x+w+6,y-h+21,'#839185',1);
    return out;
  }
  function lantern(x,y) { return r(x-2,y,4,18,'#48545a')+r(x-4,y-8,8,8,'#ffd776')+r(x-5,y-9,10,2,C.ink)+r(x-5,y-1,10,2,C.ink)+r(x-2,y-6,2,4,'#fff5c0'); }
  function railing(points,color='#557264') { return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`; }
  function planter(x,y,w=18) { return p(`${x},${y} ${x+w},${y+7} ${x+w+9},${y+3} ${x+9},${y-4}`,'#6c8f5e')+p(`${x},${y} ${x+w},${y+7} ${x+w},${y+13} ${x},${y+6}`,'#d4bf90')+p(`${x+w},${y+7} ${x+w+9},${y+3} ${x+w+9},${y+9} ${x+w},${y+13}`,'#90745a'); }

  function facility(id) {
    let a=ground();
    switch(id) {
      case 'club':
        a+=building({x:35,y:78,w:71,d:30,h:40,roof:'#9a8871',glass:true});
        a+=p('34,38 64,24 115,44 85,59','#b6ab84')+r(57,31,6,5,'#75a466')+r(66,34,6,4,'#8eaf68')+r(92,43,7,4,'#517853');
        a+=p('44,66 100,87 100,96 44,76','#ce8960')+l(43,68,99,88,'#fff0bd',2)+p('63,63 83,71 83,79 63,71','#efcf8b',C.ink,1);
        a+=bench(126,99,.7)+tinyPerson(118,89,'#79a9ac','#e8aa74',.7)+shrub(31,87,.8)+shrub(142,92,.8);break;
      case 'smart':
        a+=building({x:38,y:79,w:71,d:25,h:38,roof:'#637f86',glass:true});
        a+=p('42,42 69,29 114,46 87,61','#7e9291')+p('64,35 75,30 102,40 91,46','#d5e1c0',C.ink,1);
        a+=p('48,53 66,60 66,72 48,65','#74b9b3',C.ink,1)+p('52,56 62,60 62,67 52,63','#f9e7ab',C.ink,1)+p('83,68 102,75 102,83 83,76','#e9dfb4',C.ink,1);
        a+=r(121,66,5,25,C.ink)+r(118,59,11,10,'#a4e0ca')+r(122,62,3,3,'#fff8c2')+shrub(33,90,.8)+tinyPerson(119,94,'#b99563','#d0a073',.6);break;
      case 'hawker':
      case 'canteen':
        a+=building({x:28,y:74,w:93,d:29,h:33,roof:id==='hawker'?'#c08d56':'#749588',wall:'#e2b77e',windows:4});
        a+=p('26,56 118,90 127,87 36,52','#c9624d')+p('26,56 118,90 118,96 26,62','#e39e66');
        for(let i=0;i<5;i++){let xx=34+i*17,yy=46+i*6.5;a+=p(`${xx},${yy} ${xx+13},${yy+5} ${xx+13},${yy+12} ${xx},${yy+7}`,'#fff0b7',C.ink,1)+l(xx+3,yy+3,xx+10,yy+5,'#b65a44',2);}
        a+=p('39,86 52,80 64,85 50,91','#d5a071')+r(49,90,3,8,C.ink)+r(35,88,6,6,'#bc5546')+r(60,90,6,6,'#bc5546')+p('77,101 89,95 101,100 89,106','#d5a071')+r(87,104,3,8,C.ink)+r(72,102,6,6,'#bc5546')+r(100,103,6,6,'#bc5546');
        a+=tinyPerson(37,83,'#5b8375','#e2ac73',.6)+tinyPerson(108,106,'#af787c','#d2a279',.65)+shrub(142,95,.75);break;
      case 'walkway':
        for(let i=0;i<5;i++){let xx=34+i*23,yy=71+i*8;a+=r(xx,yy-30,4,38,'#829389')+r(xx+15,yy-37,4,38,'#829389')+l(xx,yy-18,xx+17,yy-25,'#b2b6a2',2);}
        a+=p('23,40 45,30 159,72 137,82','#a9b6a8')+p('23,40 137,82 137,87 23,45','#5f7777')+p('137,82 159,72 159,77 137,87','#4b5b60');
        for(let i=1;i<5;i++)a+=l(24+i*22,41+i*8,44+i*22,31+i*8,'#718c8a',1);
        a+=tinyPerson(79,87,'#e0b773','#b8815e',.7)+tinyPerson(111,99,'#5c799b','#e4b183',.7)+shrub(29,83,.65)+shrub(149,109,.65);break;
      case 'bus':
        a+=p('27,67 39,61 39,86 27,92','#798b7d')+r(27,67,3,26,'#485e58')+r(107,89,3,24,'#485e58')+r(139,72,3,30,'#485e58');
        a+=p('27,65 108,95 140,81 140,70 61,41 27,56','#657e7b')+p('31,68 104,95 104,107 31,80','#40564f')+p('36,71 51,76 51,85 36,80','#e5b36b',C.ink,1)+p('56,78 72,84 72,92 56,86','#edd59d',C.ink,1)+p('77,86 99,94 99,102 77,94','#babc8c',C.ink,1);
        a+=p('21,55 59,39 146,69 108,86','#d8c89a')+p('21,55 108,86 108,91 21,60','#718580')+p('108,86 146,69 146,74 108,91','#4c6265');
        a+=bench(85,103,.8)+tinyPerson(118,103,'#bd7564','#e5b386',.7)+r(150,69,3,33,C.ink)+r(144,57,14,16,'#e9d19d')+r(148,61,6,5,'#619785')+shrub(25,92,.55);break;
      case 'roof':
        a+=building({x:28,y:84,w:93,d:29,h:25,roof:'#b5ad85',wall:'#c5b69a',windows:4});
        a+=p('25,56 57,42 151,76 119,91','#71886a');
        for(let i=0;i<3;i++){let xx=42+i*24,yy=58+i*9;a+=planter(xx,yy,17)+shrub(xx+8,yy-2,.55)+shrub(xx+19,yy+2,.5);}
        a+=planter(75,52,28)+shrub(83,49,.7)+shrub(101,55,.6)+railing('25,48 25,56 119,91 151,76 151,68')+l(25,48,119,83,'#d9d6b0',2)+l(119,83,151,68,'#d9d6b0',2);
        for(let i=0;i<6;i++)a+=l(28+i*18,49+i*6.8,28+i*18,57+i*6.8,'#566c5d',2);
        a+=tinyPerson(126,75,'#e9bc82','#dfaa73',.55);break;
      case 'solar':
        a+=building({x:29,y:84,w:92,d:28,h:25,roof:'#899487',wall:'#c4b6a0',windows:4});
        for(let i=0;i<2;i++)for(let j=0;j<3;j++){let xx=40+j*27+i*15,yy=48+j*10-i*6;a+=p(`${xx},${yy} ${xx+23},${yy+8} ${xx+30},${yy+1} ${xx+7},${yy-7}`,'#355979',C.ink,2)+l(xx+12,yy+4,xx+19,yy-3,'#6fa4be',1)+l(xx+4,yy-2,xx+26,yy+5,'#6fa4be',1);}
        a+=shrub(31,96,.65)+p('134,79 148,84 148,102 134,97','#799286')+p('136,82 144,85 144,91 136,88','#e8cd83',C.ink,1);break;
      case 'rain':
        a+=building({x:42,y:77,w:61,d:23,h:36,roof:'#87a295',wall:'#ded0aa',windows:2});
        a+=p('40,42 64,31 107,47 83,59','#627d71')+p('66,39 95,49 95,52 66,42','#6c8985');
        a+=r(120,56,16,37,'#567e84')+p('120,56 128,52 136,56 128,60','#98b5ad')+r(120,74,16,3,'#82a6a2')+r(122,61,3,11,'#9cbeb0')+l(113,53,122,57,'#718f83',3)+l(112,51,112,72,'#718f83',3);
        a+=p('39,88 59,82 80,89 60,98','#5e8e82')+p('45,88 59,84 72,89 59,94','#7fc0bf',C.ink,1)+shrub(44,85,.65)+shrub(85,103,.8)+shrub(144,99,.7);break;
      case 'childcare':
        a+=building({x:34,y:80,w:68,d:31,h:34,roof:'#c2a97c',wall:'#f0d4a3',windows:3});
        a+=p('30,44 65,29 139,56 104,70','#be755a')+l(38,46,102,69,'#eeb476',2)+p('43,60 94,79 94,85 43,66','#f7d693',C.ink,1);
        a+=r(118,79,3,20,'#edb358')+r(136,74,3,22,'#edb358')+p('118,78 135,71 135,76 118,83','#708faa')+p('132,80 147,99 142,103 129,85','#b95149')+l(118,81,117,103,'#bd664b',2);
        a+=p('32,91 48,85 70,93 55,101','#ac936b')+r(41,90,4,4,'#5c8894')+r(50,92,4,4,'#bb6155')+tinyPerson(87,99,'#77a3ab','#d39b6b',.5)+tinyPerson(101,102,'#dbaf5b','#d6a571',.4)+shrub(33,90,.6);break;
      case 'daycare':
        a+=building({x:35,y:80,w:72,d:28,h:35,roof:'#74948b',wall:'#e9caa0',windows:3});
        a+=p('36,62 101,86 101,92 36,68','#cf9969')+p('60,56 85,65 85,73 60,64','#f4e0b4',C.ink,1)+l(66,61,78,66,'#ae6858',2);
        a+=p('98,107 136,90 147,95 109,112','#aeb4a0')+railing('98,101 136,84 147,89')+l(103,100,103,107)+l(121,92,121,99)+l(139,88,139,95)+bench(52,91,.8)+tinyPerson(56,89,'#a19aa9','#dca677',.6)+tinyPerson(124,98,'#c28b74','#bf8966',.65)+shrub(35,90,.6);break;
      case 'feedback':
        a+=p('37,41 110,68 110,103 37,76','#cfc09c')+p('110,68 134,58 134,93 110,103','#a18b71')+p('31,38 57,27 140,56 114,69','#697f76')+p('31,38 114,69 114,75 31,44','#516965');
        a+=p('44,49 103,71 103,94 44,72','#5d8076',C.ink,2);
        for(let i=0;i<3;i++)for(let j=0;j<2;j++){let xx=51+i*16,yy=55+i*6+j*10;a+=p(`${xx},${yy} ${xx+11},${yy+4} ${xx+11},${yy+11} ${xx},${yy+7}`,['#f2d69c','#eddcc0','#d4bf84'][(i+j)%3],C.ink,1)+l(xx+3,yy+4,xx+8,yy+6,'#a08063',1);}
        a+=tinyPerson(121,99,'#ac7f84','#e0ab7e',.8)+tinyPerson(65,89,'#7a9b8d','#c38c64',.6)+shrub(31,83,.75);break;
      case 'rest':
        a+=p('49,71 67,62 121,81 103,89','#729282')+r(48,63,4,28,'#637766')+r(101,82,4,29,'#637766')+r(133,67,4,30,'#637766')+p('42,56 78,40 144,63 107,81','#b99762')+p('42,56 107,81 107,85 42,60','#806e55')+p('107,81 144,63 144,67 107,85','#7e725d');
        a+=bench(72,92,1.1)+tinyPerson(65,91,'#b49788','#d5a379',.65)+tinyPerson(94,101,'#719fa2','#b48462',.65)+shrub(35,91,1)+shrub(147,95,1)+lantern(28,77);break;
      case 'blank':
        a+=p('29,75 71,57 139,82 97,101','#9da08c')+p('29,75 97,101 97,106 29,80','#817c69')+p('97,101 139,82 139,87 97,106','#686e62');
        a+=p('51,72 61,68 97,81 87,86','#c2b399')+l(37,79,84,96,'#d6c9a6',1)+l(91,92,122,79,'#d6c9a6',1)+bench(129,96,.8)+shrub(31,86,.75)+shrub(147,88,.75)+tinyPerson(99,94,'#d5a260','#e0aa78',.65);break;
      case 'soundproof':
        a+=building({x:35,y:80,w:69,d:28,h:38,roof:'#738481',wall:'#c7b991',windows:3});
        a+=p('36,46 103,71 103,83 36,58','#699290')+p('41,47 56,52 56,59 41,54','#a6c0a7',C.ink,1)+p('62,55 77,61 77,68 62,62','#a6c0a7',C.ink,1)+p('83,63 98,69 98,76 83,70','#a6c0a7',C.ink,1);
        a+=p('112,74 132,66 132,96 112,104','#889583')+l(118,73,118,101,'#a6b1a0',1)+l(125,70,125,98,'#a6b1a0',1)+shrub(31,90,.8)+shrub(142,95,.8)+bench(77,104,.6);break;
      case 'retrofit':
        a+=building({x:33,y:82,w:74,d:28,h:48,roof:'#9f967e',wall:'#d9c8a3',windows:3});
        a+=p('35,51 105,77 105,85 35,60','#d5d0b2')+l(36,55,104,80,'#7b9188',2)+p('110,72 134,62 134,76 110,86','#71959b')+p('113,76 130,69 130,72 113,80','#b5d0c0',C.ink,1);
        a+=p('90,109 120,96 148,104 118,118','#b9baa2')+railing('90,103 120,90 148,98')+l(96,101,96,108)+l(122,92,122,99)+l(144,97,144,104)+tinyPerson(54,90,'#c38b63','#d5a173',.65)+shrub(31,94,.65)+shrub(148,88,.75);break;
      default:a+=building({});a+=shrub(30,87,.75)+shrub(145,95,.8);
    }
    return svg(a,180,130,facilityNames[id] || 'Community facility');
  }

  function head(x,y,s,kind,skin='#e6ab7c') {
    let out = `<g transform="translate(${x} ${y}) scale(${s})">`;
    if(kind==='hijab') {
      out+=r(-14,-18,28,8,C.ink)+r(-18,-10,36,26,C.ink)+r(-17,14,34,12,C.ink)+r(-11,-17,22,8,'#bf718a')+r(-15,-9,30,24,'#a76a89')+r(-13,14,26,10,'#8a6484')+r(-8,-10,18,8,'#e99eb0')+r(-8,-6,18,20,skin)+r(-6,14,13,4,skin)+r(-13,-7,5,22,'#c57f9b')+r(10,-5,4,22,'#865d7a');
    } else {
      out+=r(-12,-14,24,7,C.ink)+r(-15,-7,30,21,C.ink)+r(-11,14,22,5,C.ink)+r(-11,-8,22,22,skin)+r(-7,14,14,4,skin)+r(-14,-2,3,10,skin)+r(11,-2,3,10,skin);
      if(kind==='elder') out+=r(-13,-13,26,6,'#c5bdb0')+r(-16,-7,7,9,'#d9d2bf')+r(9,-7,7,9,'#d9d2bf')+r(-10,-17,20,6,'#aaa9a3')+r(-7,-20,14,5,'#d4cfbf')+r(-14,-11,6,5,'#efddc3')+r(8,-12,6,5,'#b3b3aa')+r(-12,6,4,8,'#c8ba9c')+r(9,6,4,8,'#c8ba9c');
      else if(kind==='long') out+=r(-13,-16,27,10,'#252b36')+r(-16,-8,7,25,'#252b36')+r(10,-8,7,28,'#252b36')+r(-12,-13,10,9,'#2b303a')+r(-14,16,6,10,'#252b36')+r(11,19,6,7,'#252b36')+r(-10,-13,3,4,'#56515a')+r(9,-10,3,8,'#4c454d');
      else if(kind==='worker') out+=r(-16,-15,32,6,C.ink)+r(-13,-23,26,9,C.ink)+r(-9,-28,18,6,C.ink)+r(-12,-22,24,8,'#dfac40')+r(-8,-27,16,6,'#efc360')+r(-16,-14,32,4,'#efc360')+r(-4,-25,4,13,'#f6d581')+r(8,-23,3,9,'#bb852e')+r(-5,11,12,3,'#493c35');
      else out+=r(-13,-14,26,8,'#242c38')+r(-16,-9,5,8,'#242c38')+r(10,-9,6,8,'#242c38')+r(-8,-18,18,5,'#242c38')+r(-13,-11,6,6,'#4c4544')+r(-8,-13,6,6,'#242c38')+r(5,-12,4,5,'#242c38');
    }
    out+=r(-7,-2,4,3,C.ink)+r(4,-2,4,3,C.ink)+r(-6,-2,1,1,'#fff5d0')+r(5,-2,1,1,'#fff5d0')+r(-2,3,3,5,'#bb805f')+r(-5,10,10,2,kind==='elder'?'#955e52':'#934b4e')+r(-10,6,3,3,'#cf886d')+r(8,6,3,3,'#cf886d');
    if(kind==='elder')out+=r(-8,3,5,1,'#a87967')+r(4,3,5,1,'#a87967')+r(-8,8,2,2,'#a87967')+r(6,8,2,2,'#a87967');
    return out+'</g>';
  }
  function body(x,y,s,color,shirt='#f3e2c2') {
    return `<g transform="translate(${x} ${y}) scale(${s})">${r(-9,-4,18,9,C.ink)}${r(-17,4,34,24,C.ink)}${r(-20,13,40,15,C.ink)}${r(-8,-3,16,8,shirt)}${r(-16,6,32,21,color)}${r(-11,7,21,21,shirt)}${r(-3,6,5,22,color)}${r(-18,14,5,14,color)}${r(13,14,5,14,color)}</g>`;
  }
  function portrait(id) {
    const palette={chen:['#666978','#e9c99a'],lin:['#3c626b','#bbd1b7'],aisyah:['#7c607b','#e0bca4'],mei:['#7e858b','#d6c7aa'],kumar:['#787358','#b9ba85']};
    const bg=palette[id]||palette.chen;
    let a=r(0,0,72,72,bg[0])+r(4,4,64,64,bg[1])+r(4,50,64,18,'#a38c77')+r(5,6,5,41,'#eee2b7')+r(60,7,6,40,'#d4ae82')+r(7,53,59,4,'#746958');
    if(id==='chen')a+=body(36,51,1.1,'#b46d6a','#e1b99c')+head(36,30,1.1,'elder','#e6b28d')+r(42,59,9,4,'#edd4a8')+r(45,56,4,8,'#ddc4a3');
    else if(id==='lin')a+=body(45,48,1,'#a4a597','#e7e0be')+head(45,26,.92,'short','#e8b487')+body(17,57,.72,'#668c8b','#eee0b9')+head(18,42,.72,'long','#dfa57d')+body(41,68,.65,'#d59d54','#f3cb86')+head(42,54,.65,'short','#f0bd8a');
    else if(id==='aisyah')a+=body(32,51,1.1,'#ab708e','#d0999b')+head(30,30,1.02,'hijab','#be885f')+body(53,65,.61,'#a8a37b','#e9c782')+head(53,52,.64,'short','#c08b66');
    else if(id==='mei')a+=body(36,51,1.12,'#d0b293','#f8e4bd')+head(36,31,1.1,'long','#edbb97')+r(20,54,6,9,'#32313b')+r(45,52,7,10,'#32313b')+r(34,61,5,8,'#a57462');
    else if(id==='kumar')a+=body(36,53,1.1,'#d9a044','#edd19b')+head(36,33,1,'worker','#a57352')+r(22,59,5,12,'#efbc56')+r(48,60,5,11,'#efbc56')+r(34,62,4,9,'#65735f');
    a+=r(0,0,72,3,C.ink)+r(0,69,72,3,C.ink)+r(0,0,3,72,C.ink)+r(69,0,3,72,C.ink);
    return svg(a,72,72,residentNames[id] || 'Neighbour');
  }

  function photo(id) {
    id=({chen:'chess',lin:'skate',aisyah:'feast',mei:'door',kumar:'shade'})[id]||id;
    const S={dark:'#4f4438',mid:'#8d795d',light:'#d6c49a',paper:'#e7d7ad',shade:'#bba782'};
    let a=r(0,0,128,90,S.paper)+r(5,5,118,80,S.light)+r(5,5,118,23,'#cbbb94')+r(5,59,118,26,S.mid);
    for(let i=0;i<8;i++){let xx=5+i*17,hh=13+(i%3)*5;a+=r(xx,28-hh,14,hh,S.shade)+r(xx+3,22-hh,3,4,S.mid)+r(xx+8,22-hh,3,4,S.mid);}
    if(id==='chess'){
      a+=r(14,30,6,49,S.dark)+r(12,29,39,8,S.dark)+r(15,26,34,5,S.mid)+r(46,34,5,27,S.dark)+r(64,40,5,24,S.dark)+r(66,37,48,6,S.dark)+r(103,40,6,35,S.dark);
      a+=p('35,55 53,48 77,57 58,65',S.paper,S.dark,2)+r(54,63,5,17,S.dark)+r(27,56,10,4,S.dark)+r(77,62,11,4,S.dark)+tinyPerson(29,54,S.dark,S.paper,.67)+tinyPerson(85,60,S.dark,S.paper,.67);
      for(let i=0;i<4;i++)a+=r(45+i*6,55+(i%2)*2,3,3,S.dark);
    } else if(id==='skate'){
      a+=p('5,65 49,49 123,73 81,85',S.shade,S.mid,1)+r(20,31,4,28,S.dark)+r(90,22,4,48,S.dark)+l(19,31,90,21,S.dark,2)+l(32,29,32,54,S.dark,1)+l(46,27,46,51,S.dark,1)+r(73,47,8,4,S.dark)+r(72,51,8,8,S.paper)+p('70,58 80,58 85,68 76,72',S.dark,S.dark,1)+l(73,63,61,64,S.dark,3)+l(76,70,70,77,S.dark,3)+l(81,67,89,71,S.dark,3)+r(63,78,31,3,S.dark)+r(65,82,4,3,S.dark)+r(88,82,4,3,S.dark)+tinyPerson(31,65,S.dark,S.paper,.5);
    } else if(id==='feast'){
      a+=r(10,26,108,8,S.dark)+r(13,33,4,33,S.dark)+r(110,33,4,33,S.dark)+r(16,39,91,13,S.shade)+r(22,40,17,8,S.paper)+r(47,40,16,8,S.paper)+r(70,40,29,8,S.paper)+p('19,64 60,50 109,68 68,82',S.paper,S.dark,2)+r(31,76,4,9,S.dark)+r(98,72,4,13,S.dark);
      for(let i=0;i<5;i++)a+=tinyPerson(26+i*19,61+(i%2)*-6,S.dark,S.paper,.47);
      a+=r(50,67,10,3,S.mid)+r(72,68,9,3,S.mid)+r(62,62,5,5,S.mid);
    } else if(id==='door'){
      a+=r(13,8,104,72,S.shade)+r(19,11,44,65,S.dark)+r(22,14,38,60,S.mid)+r(27,18,28,16,S.shade)+r(27,40,28,26,S.shade)+r(51,38,4,3,S.paper)+r(70,12,37,24,S.dark)+r(73,15,31,18,S.paper)+l(88,15,88,33,S.mid,2)+l(73,24,104,24,S.mid,2)+r(72,58,35,4,S.dark)+r(74,62,4,15,S.dark)+r(102,62,4,15,S.dark)+tinyPerson(63,63,S.dark,S.paper,.78)+shrub(108,72,.55);
    } else {
      a+=r(32,34,10,40,S.dark)+r(29,29,16,17,S.dark)+r(17,19,38,18,S.dark)+r(22,13,30,12,S.mid)+r(9,29,22,12,S.mid)+r(49,27,20,13,S.mid)+r(40,16,21,15,S.shade)+r(73,28,7,37,S.dark)+r(65,16,25,18,S.mid)+r(60,26,37,15,S.dark)+bench(84,63,1.1)+tinyPerson(79,58,S.dark,S.paper,.61)+tinyPerson(104,68,S.dark,S.paper,.55)+p('14,75 54,61 87,72 50,85',S.shade,S.mid,1);
    }
    // Narrow irregular grains give the scenes a faded printed-photo surface.
    for(let i=0;i<28;i++){let x=8+(i*37)%112,y=8+(i*23)%74;a+=r(x,y,i%3===0?3:1,1,i%2?S.paper:S.dark,'opacity=".2"');}
    a+=r(0,0,128,4,S.paper)+r(0,86,128,4,S.paper)+r(0,0,4,90,S.paper)+r(124,0,4,90,S.paper)+r(4,4,120,1,S.dark)+r(4,85,120,1,S.dark)+r(4,4,1,82,S.dark)+r(123,4,1,82,S.dark);
    a=a.replaceAll(C.ink,S.dark).replaceAll(C.clay,S.mid).replaceAll(C.leaf,S.dark).replaceAll(C.leaflit,S.mid).replaceAll('#ddd38a',S.light).replaceAll('#eaa156',S.light).replaceAll('#759762',S.shade).replaceAll('#bb885b',S.mid).replaceAll('#5f8474',S.dark).replaceAll('#a3a783',S.light).replaceAll('#453e36',S.dark);
    return svg(a,128,90,photoNames[id] || 'Neighbourhood memory');
  }
  window.GameArt={portrait,facility,photo};
})();
