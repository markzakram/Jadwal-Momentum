/***********************************************************************
 * DASHBOARD JADWAL SELEKSI — Backend (Code.gs)
 * Pasang di: Extensions ▸ Apps Script. Lalu Deploy ▸ New deployment ▸ Web app.
 ***********************************************************************/

const SHEET_NAME = 'DATA';
const HEADERS = [
  'ID','Tipe','Platform','Program','Reg Buka','Reg Tutup',
  'Tahap 1','T1 Mulai','T1 Akhir','Pengumuman T1',
  'Tahap 2','T2 Mulai','T2 Akhir','Pengumuman T2',
  'Pengumuman Akhir','Catatan','Link Web','Link Ebook'
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Jadwal Seleksi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(f){ return HtmlService.createHtmlOutputFromFile(f).getContent(); }

function getSheet_(name) {
  const sheetName = name || SHEET_NAME;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.appendRow(HEADERS);
    sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function toISO_(v){
  if (!v) return '';
  if (Object.prototype.toString.call(v)==='[object Date]')
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v);
}
function parseDate_(s){
  if (!s) return '';
  const p = String(s).split('-');
  if (p.length===3) return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
  return s;
}

function rowToObj_(row){
  return {
    id:row[0], tipe:row[1]||'Real', platform:row[2]||'', program:row[3]||'',
    regBuka:toISO_(row[4]), regTutup:toISO_(row[5]),
    tahap1:row[6]||'', t1Mulai:toISO_(row[7]), t1Akhir:toISO_(row[8]), pengT1:toISO_(row[9]),
    tahap2:row[10]||'', t2Mulai:toISO_(row[11]), t2Akhir:toISO_(row[12]), pengT2:toISO_(row[13]),
    pengAkhir:toISO_(row[14]), catatan:row[15]||'', linkWeb:row[16]||'', linkEbook:row[17]||''
  };
}
function objToRow_(o){
  return [
    o.id, o.tipe, o.platform, o.program, parseDate_(o.regBuka), parseDate_(o.regTutup),
    o.tahap1, parseDate_(o.t1Mulai), parseDate_(o.t1Akhir), parseDate_(o.pengT1),
    o.tahap2, parseDate_(o.t2Mulai), parseDate_(o.t2Akhir), parseDate_(o.pengT2),
    parseDate_(o.pengAkhir), o.catatan, o.linkWeb, o.linkEbook
  ];
}

function getData(sheetName){
  const sh = getSheet_(sheetName);
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let r=1; r<v.length; r++){
    if (!v[r][2] && !v[r][1]) continue;
    out.push(rowToObj_(v[r]));
  }
  return out;
}

function addEntry(obj, sheetName){
  const sh = getSheet_(sheetName);
  const data = sh.getDataRange().getValues();
  let maxId = 0;
  for (let r=1; r<data.length; r++){ const id=Number(data[r][0]); if(!isNaN(id)&&id>maxId) maxId=id; }
  obj.id = maxId+1;
  sh.appendRow(objToRow_(obj));
  formatDates_(sh, sh.getLastRow());
  return getData(sheetName);
}
function updateEntry(obj, sheetName){
  const sh = getSheet_(sheetName);
  const data = sh.getDataRange().getValues();
  for (let r=1; r<data.length; r++){
    if (Number(data[r][0])===Number(obj.id)){
      sh.getRange(r+1,1,1,HEADERS.length).setValues([objToRow_(obj)]);
      formatDates_(sh, r+1);
      break;
    }
  }
  return getData(sheetName);
}
function deleteEntry(id, sheetName){
  const sh = getSheet_(sheetName);
  const data = sh.getDataRange().getValues();
  for (let r=data.length-1; r>=1; r--){
    if (Number(data[r][0])===Number(id)){ sh.deleteRow(r+1); break; }
  }
  return getData(sheetName);
}
function formatDates_(sh, r){
  [5,6,8,9,10,12,13,14,15].forEach(c => sh.getRange(r,c).setNumberFormat('dd-mmm-yyyy'));
}
function getPlatforms(sheetName){
  const set={}; getData(sheetName).forEach(x=>{ if(x.platform) set[x.platform]=true; });
  return Object.keys(set).sort();
}

/***********************************************************************
 * seedDataSheet() — JALANKAN SEKALI untuk mengisi sheet DATA otomatis.
 ***********************************************************************/
function seedDataSheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_NAME);
  sh.appendRow(HEADERS);

  const WEB={Cerebrum:'https://pddikti.kemdiktisaintek.go.id/',JadiPolisi:'https://penerimaan.polri.go.id/',
    JadiPCPM:'https://www.bi.go.id/id/default.aspx',JadiPrajurit:'https://rekrutmen-tni.mil.id/',
    JadiBUMN:'https://www.bumn.go.id/',JadiSekdin:'https://ptdisttd.ac.id/',
    JadiBeasiswa:'https://lpdp.kemenkeu.go.id/',JadiASN:'https://asndigital.bkn.go.id/',
    JadiPPG:'https://ppg.kemendikdasmen.go.id/',JadiPPPK:'https://asndigital.bkn.go.id/',
    JadiOJK:'https://www.ojk.go.id/id/Default.aspx'};
  const EB={Cerebrum:'https://bit.ly/EbookRangkumanTKA',JadiPolisi:'https://bit.ly/EbookRangkumanJADIPOLISI',
    JadiPCPM:'https://bit.ly/EbookRangkumanJADIPCPM',JadiPrajurit:'https://bit.ly/EbookRangkumanJADIPRAJURIT',
    JadiBUMN:'https://bit.ly/EbookRangkumanJADIBUMN',JadiSekdin:'https://bit.ly/EbookRangkumanJADISEKDIN',
    JadiBeasiswa:'https://bit.ly/EbookRangkumanJADIBEASISWA',JadiASN:'https://bit.ly/EbookRangkumanJADIASN',
    JadiPPG:'https://bit.ly/EbookRangkumanJADIPPG',JadiPPPK:'https://bit.ly/EbookRangkumanJADIPPPK',
    JadiOJK:'https://bit.ly/EbookRangkumanJADIOJK'};
  const d=(m,day)=>new Date(2026,m-1,day), _='';
  // tipe,plat,prog,regB,regT, t1,t1m,t1a,pengT1, t2,t2m,t2a,pengT2, pengAkhir, catatan
  const seed=[
   ['Real','Cerebrum','TKA',d(3,25),d(4,7),'Jadwal Tes',d(4,21),d(4,30),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Akpol Psikologi',d(3,9),d(3,10),'CAT Psikologi',d(4,23),d(4,25),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Akpol Akademik',d(3,9),d(3,10),'CAT Uji Akademik',d(5,6),d(5,11),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Bintara Psikologi',d(3,9),d(3,30),'CAT Psikologi I',d(4,26),d(5,3),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Bintara Akademik',d(3,9),d(3,30),'CAT Uji Akademik',d(5,12),d(5,26),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Tamtama Psikologi',d(3,9),d(3,30),'CAT Psikologi I',d(5,4),d(5,5),_,_,_,_,_,_,''],
   ['Real','JadiPolisi','Tamtama Akademik',d(3,9),d(3,30),'CAT Uji Akademik',d(5,24),d(5,26),_,_,_,_,_,_,''],
   ['Real','JadiPCPM','Special Hire & PKWT',d(4,12),d(4,17),'Tes (Prediksi)',d(5,1),d(7,31),_,_,_,_,_,_,'Prediksi: TPD minggu ke-2 Mei, Pengetahuan Umum & Inggris minggu ke-4 Mei'],
   ['Real','JadiPrajurit','Taruna',d(3,3),d(4,10),'Pengujian Daerah',d(4,1),d(7,31),_,_,_,_,_,_,'Seleksi Integratif Tingkat Pusat (Selinpud) Juli 2026'],
   ['Real','JadiPrajurit','Bintara PK TNI AD',d(4,20),d(5,3),_,_,_,_,_,_,_,_,_,'Belum ada informasi tanggal tes, segera dibuka'],
   ['Real','JadiPrajurit','Tamtama',_,_,_,_,_,_,_,_,_,_,_,'Belum ada informasi pendaftaran'],
   ['Real','JadiBUMN','Rekrutmen PHTC 2026',d(4,15),d(4,24),'Seleksi Kompetensi',d(5,3),d(5,12),d(5,17),'Seleksi Kompetensi Tambahan',d(5,20),d(5,31),d(6,5),d(6,12),'Pengumuman tahap 1: 17-19 Mei 2026'],
   ['Real','JadiBUMN','Rekrutmen PT Garam 2026',d(4,17),_,_,_,_,_,_,_,_,_,_,'Pendaftaran masih dibuka'],
   ['Prediksi','JadiSekdin',_,d(5,31),d(6,13),'SKD (CAT BKN)',d(6,14),d(6,25),d(6,30),'SKB (Fisik & Kesehatan)',d(6,26),d(7,11),d(7,16),d(7,23),''],
   ['Prediksi','JadiBeasiswa','BII',d(6,1),d(7,31),'Tes Bakat Skolastik (TBS)',d(9,1),d(9,30),d(10,5),'Wawancara',d(10,1),d(11,30),d(12,5),d(12,12),''],
   ['Prediksi','Cerebrum','TKA SMA (Official)',d(8,18),d(9,27),'Gladi Bersih',d(10,5),d(10,11),_,'Ujian Utama (Gel I & II)',d(10,26),d(11,8),d(11,13),d(11,20),''],
   ['Prediksi','JadiASN','CPNS',d(8,17),d(8,31),'SKD (TWK, TIU, TKP)',d(9,16),d(10,5),d(10,10),'SKB (Materi Jabatan)',d(10,6),d(10,17),d(10,22),d(10,29),''],
   ['Prediksi','JadiPCPM','BI',d(8,27),d(9,2),'Tes Potensi Dasar (TPD)',d(9,10),d(9,22),d(9,27),'TPU, Kebanksentralan, B.Inggris',d(9,23),d(10,6),d(10,11),d(10,18),''],
   ['Prediksi','JadiPPG',_,d(9,25),d(10,5),'Tes Substantif',d(10,9),d(10,18),d(10,23),'Tes Wawancara',d(10,19),d(10,27),d(11,1),d(11,8),''],
   ['Prediksi','JadiBUMN','PLN',d(10,5),d(10,15),'TKD & Bahasa Inggris',d(10,19),d(10,31),d(11,5),'AKHLAK & Tes Bidang',d(11,1),d(11,13),d(11,18),d(11,25),''],
   ['Prediksi','JadiPPPK','Gel II',d(11,10),d(11,20),'Seleksi Kompetensi',d(11,24),d(11,30),d(12,5),'Wawancara',d(12,1),d(12,5),d(12,10),d(12,17),''],
   ['Prediksi','JadiOJK',_,d(11,11),d(11,21),'PU & TKD',d(11,25),d(12,7),d(12,12),'SKB Keuangan & Psikotes',d(12,8),d(12,19),d(12,24),d(12,31),'']
  ];
  const out = seed.map((r,i)=>[
    i+1, r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],r[12],r[13],r[14],
    WEB[r[1]]||'', EB[r[1]]||''
  ]);
  sh.getRange(2,1,out.length,HEADERS.length).setValues(out);
  sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  [5,6,8,9,10,12,13,14,15].forEach(c=> sh.getRange(2,c,out.length,1).setNumberFormat('dd-mmm-yyyy'));
  const w=[40,65,95,150,85,85,150,80,80,100,170,80,80,100,110,230,200,200];
  w.forEach((x,i)=> sh.setColumnWidth(i+1,x));
  SpreadsheetApp.getUi().alert('Sheet DATA dibuat & diisi '+out.length+' baris (dengan kolom pengumuman).');
}

function seedData2025(){
  const SHEET='data2025';
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(SHEET); if(sh) ss.deleteSheet(sh);
  sh=ss.insertSheet(SHEET); sh.appendRow(HEADERS);
  const dd=(y,m,d)=>new Date(y,m-1,d), _='';
  const WEB={Cerebrum:'https://snpmb.bppp.kemdikbud.go.id/',JadiPolisi:'https://penerimaan.polri.go.id/',JadiPrajurit:'https://rekrutmen-tni.mil.id/',JadiSekdin:'https://dikdin.bkn.go.id/',JadiBeasiswa:'https://lpdp.kemenkeu.go.id/',JadiASN:'https://sscasn.bkn.go.id/',JadiPPPK:'https://sscasn.bkn.go.id/',JadiBUMN:'https://rekrutmenbersama.fhcibumn.id/',JadiPCPM:'https://www.bi.go.id/id/default.aspx',JadiOJK:'https://www.ojk.go.id/id/Default.aspx',JadiPPG:'https://ppg.kemendikdasmen.go.id/'};
  const EB={Cerebrum:'https://bit.ly/EbookRangkumanTKA',JadiPolisi:'https://bit.ly/EbookRangkumanJADIPOLISI',JadiPrajurit:'https://bit.ly/EbookRangkumanJADIPRAJURIT',JadiSekdin:'https://bit.ly/EbookRangkumanJADISEKDIN',JadiBeasiswa:'https://bit.ly/EbookRangkumanJADIBEASISWA',JadiASN:'https://bit.ly/EbookRangkumanJADIASN',JadiPPPK:'https://bit.ly/EbookRangkumanJADIPPPK',JadiBUMN:'https://bit.ly/EbookRangkumanJADIBUMN',JadiPCPM:'https://bit.ly/EbookRangkumanJADIPCPM',JadiOJK:'https://bit.ly/EbookRangkumanJADIOJK',JadiPPG:'https://bit.ly/EbookRangkumanJADIPPG'};
  const seed=[
   ['Real','Cerebrum','SNBP 2025',dd(2025,2,4),dd(2025,2,18),'Seleksi Berdasarkan Prestasi',_,_,_,_,_,_,_,dd(2025,3,18),'Jalur tanpa tes tulis (nilai rapor & prestasi).'],
   ['Real','Cerebrum','UTBK-SNBT 2025',dd(2025,3,11),dd(2025,3,27),'Pelaksanaan UTBK',dd(2025,4,23),dd(2025,5,3),_,_,_,_,_,dd(2025,5,28),'Sertifikat UTBK 3 Jun-31 Jul 2025.'],
   ['Real','JadiSekdin','Sekolah Kedinasan 2025',dd(2025,6,29),dd(2025,7,18),'SKD (CAT BKN)',dd(2025,8,11),dd(2025,8,26),dd(2025,8,27),'Seleksi Lanjutan (CAT BKN)',dd(2025,9,15),dd(2025,9,16),_,dd(2025,9,18),'7 instansi, 3.252 formasi.'],
   ['Real','JadiPPPK','PPPK 2024 Tahap 2',dd(2024,11,17),dd(2025,1,20),'Seleksi Kompetensi',dd(2025,4,22),dd(2025,5,16),_,'Kompetensi Teknis Tambahan',dd(2025,4,25),dd(2025,5,17),_,dd(2025,5,22),'PPPK TA 2024 Tahap 2 (tes & pengumuman 2025).'],
   ['Real','JadiBeasiswa','LPDP Tahap 1 2025',dd(2025,1,17),dd(2025,2,17),'Seleksi Bakat Skolastik',dd(2025,4,14),dd(2025,4,28),dd(2025,5,2),'Seleksi Substansi',dd(2025,5,6),dd(2025,6,5),_,dd(2025,6,19),'Pengumuman administrasi 7 Mar 2025.'],
   ['Real','JadiBUMN','Rekrutmen Bersama BUMN 2025',dd(2025,3,7),dd(2025,3,19),'Tes Online 1 (TKD, AKHLAK, TWK)',dd(2025,4,19),dd(2025,4,28),dd(2025,5,12),'Tes Kemampuan Bidang (TKB)',dd(2025,6,16),dd(2025,7,11),_,dd(2025,7,18),'Tahap/akhir bervariasi per BUMN.'],
   ['Real','JadiPolisi','Akpol 2025',dd(2025,2,4),dd(2025,3,6),'Rikmin Awal & Pakta Integritas',dd(2025,3,7),dd(2025,3,11),_,_,_,_,_,_,'275 taruna. Seleksi lanjutan Mar-Jun 2025.'],
   ['Real','JadiPolisi','Bintara 2025',dd(2025,2,4),dd(2025,3,6),'Rikmin & Verifikasi',dd(2025,3,7),dd(2025,3,11),_,_,_,_,_,_,'Seleksi lanjutan Mar-Mei 2025.'],
   ['Real','JadiPolisi','Tamtama 2025',dd(2025,2,5),dd(2025,3,6),'Rikmin & Verifikasi',dd(2025,3,7),dd(2025,3,11),_,_,_,_,_,_,'Seleksi lanjutan Mar-Mei 2025.'],
   ['Real','JadiPrajurit','Taruna Akmil 2025',dd(2025,3,3),dd(2025,4,17),'Validasi & Seleksi Daerah',dd(2025,4,1),dd(2025,6,30),_,_,_,_,_,_,'Seleksi tingkat pusat setelah validasi.'],
   ['Real','JadiPrajurit','Bintara/Tamtama TNI AD 2025',dd(2025,3,20),dd(2025,6,8),'Validasi Berkas',dd(2025,5,1),dd(2025,6,13),_,_,_,_,_,_,'Jadwal seleksi disampaikan saat validasi.'],
   ['Real','JadiASN','CPNS 2024 (CASN)',dd(2024,8,20),dd(2024,9,10),'SKD (CAT BKN)',dd(2024,10,16),dd(2024,11,14),dd(2024,11,17),'SKB',dd(2024,12,9),dd(2024,12,20),_,dd(2025,1,5),'Kelulusan akhir 5-12 Jan 2025; pascasanggah 16-22 Jan.'],
   ['Real','JadiPCPM','PCPM BI Angkatan 40',dd(2025,9,7),dd(2025,9,12),'Tes Potensi Dasar (TPD)',dd(2025,9,22),dd(2025,9,28),dd(2025,9,24),'Tes Teknis & Psikotes',dd(2025,10,11),dd(2025,11,15),_,dd(2025,12,19),'Pengumuman administrasi 24 Sep; wawancara awal Des 2025.'],
   ['Real','JadiOJK','PCAM 9 OJK 2025',dd(2025,11,21),dd(2025,11,27),'Seleksi Administrasi',dd(2025,11,28),dd(2025,12,12),dd(2025,12,12),_,_,_,_,_,'Jalur PCAM 9 & MLE; tes kompetensi/wawancara/kesehatan lanjut hingga awal 2026.'],
   ['Real','JadiPPG','PPG Guru Tertentu Periode 4',dd(2025,10,9),dd(2025,11,15),'Seleksi Administrasi (SIMPKB)',dd(2025,10,9),dd(2025,11,15),_,_,_,_,_,_,'PPG bagi Guru Tertentu. Pembelajaran & uji kompetensi setelah administrasi.'],
  ];
  const out=seed.map((r,i)=>[i+1,r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],r[12],r[13],r[14],WEB[r[1]]||'',EB[r[1]]||'']);
  sh.getRange(2,1,out.length,HEADERS.length).setValues(out);
  sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#3A2F5F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  [5,6,8,9,10,12,13,14,15].forEach(c=> sh.getRange(2,c,out.length,1).setNumberFormat('dd-mmm-yyyy'));
  SpreadsheetApp.getUi().alert('data2025 dimuat: '+out.length+' baris.');
}

function seedDataDummy(){
  const SHEET='dataDummy';
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(SHEET); if(sh) ss.deleteSheet(sh);
  sh=ss.insertSheet(SHEET); sh.appendRow(HEADERS);
  const dd=(y,m,d)=>new Date(y,m-1,d), _='';
  const WEB={Cerebrum:'https://snpmb.bppp.kemdikbud.go.id/',JadiPolisi:'https://penerimaan.polri.go.id/',JadiPrajurit:'https://rekrutmen-tni.mil.id/',JadiSekdin:'https://dikdin.bkn.go.id/',JadiBeasiswa:'https://lpdp.kemenkeu.go.id/',JadiASN:'https://sscasn.bkn.go.id/',JadiPPPK:'https://sscasn.bkn.go.id/',JadiBUMN:'https://rekrutmenbersama.fhcibumn.id/',JadiPCPM:'https://www.bi.go.id/id/default.aspx',JadiOJK:'https://www.ojk.go.id/id/Default.aspx',JadiPPG:'https://ppg.kemendikdasmen.go.id/'};
  const EB={Cerebrum:'https://bit.ly/EbookRangkumanTKA',JadiPolisi:'https://bit.ly/EbookRangkumanJADIPOLISI',JadiPrajurit:'https://bit.ly/EbookRangkumanJADIPRAJURIT',JadiSekdin:'https://bit.ly/EbookRangkumanJADISEKDIN',JadiBeasiswa:'https://bit.ly/EbookRangkumanJADIBEASISWA',JadiASN:'https://bit.ly/EbookRangkumanJADIASN',JadiPPPK:'https://bit.ly/EbookRangkumanJADIPPPK',JadiBUMN:'https://bit.ly/EbookRangkumanJADIBUMN',JadiPCPM:'https://bit.ly/EbookRangkumanJADIPCPM',JadiOJK:'https://bit.ly/EbookRangkumanJADIOJK',JadiPPG:'https://bit.ly/EbookRangkumanJADIPPG'};
  const seed=[
   ['Real','JadiBUMN','Demo — Akan Datang',dd(2026,7,1),dd(2026,7,20),'Tes Online',dd(2026,8,10),dd(2026,8,20),_,_,_,_,_,dd(2026,9,10),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiPolisi','Demo — Buka',dd(2026,6,1),dd(2026,6,30),'CAT Psikologi',dd(2026,7,15),dd(2026,7,25),_,_,_,_,_,dd(2026,8,10),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiSekdin','Demo — Menunggu Tes',dd(2026,5,1),dd(2026,5,31),'SKD (CAT BKN)',dd(2026,7,1),dd(2026,7,10),_,_,_,_,_,dd(2026,7,25),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','Cerebrum','Demo — Tes Berlangsung',dd(2026,4,1),dd(2026,4,30),'Pelaksanaan UTBK',dd(2026,6,5),dd(2026,6,20),_,_,_,_,_,dd(2026,7,5),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiBeasiswa','Demo — Menunggu Hasil',dd(2026,3,1),dd(2026,3,31),'Seleksi Substansi',dd(2026,5,20),dd(2026,6,5),_,_,_,_,_,dd(2026,6,25),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiASN','Demo — Selesai',dd(2026,1,5),dd(2026,1,31),'SKD',dd(2026,2,10),dd(2026,2,20),dd(2026,2,25),_,_,_,_,dd(2026,3,5),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiPCPM','Demo — 2 Tahap (Buka)',dd(2026,6,8),dd(2026,6,25),'Tes Potensi Dasar',dd(2026,7,15),dd(2026,7,25),dd(2026,8,1),'Tes Substansi',dd(2026,8,10),dd(2026,8,20),dd(2026,8,28),dd(2026,9,1),'Data dummy untuk demo tampilan dashboard.'],
   ['Real','JadiPrajurit','Demo — 2 Tahap (Tes)',dd(2026,4,10),dd(2026,5,10),'Seleksi Daerah',dd(2026,6,1),dd(2026,6,15),dd(2026,6,22),'Seleksi Pusat',dd(2026,7,1),dd(2026,7,10),_,dd(2026,7,20),'Data dummy untuk demo tampilan dashboard.'],
   ['Prediksi','JadiOJK','Demo Prediksi — Akan Datang',dd(2026,9,1),dd(2026,9,15),'Tes Kompetensi',dd(2026,10,10),dd(2026,10,20),_,'Wawancara',dd(2026,11,1),dd(2026,11,10),_,dd(2026,11,25),'Data dummy untuk demo tampilan dashboard.'],
   ['Prediksi','JadiPPG','Demo Prediksi — Akan Datang',dd(2026,8,1),dd(2026,8,31),'Seleksi Administrasi',dd(2026,9,5),dd(2026,9,20),_,_,_,_,_,dd(2026,10,10),'Data dummy untuk demo tampilan dashboard.'],
  ];
  const out=seed.map((r,i)=>[i+1,r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],r[12],r[13],r[14],WEB[r[1]]||'',EB[r[1]]||'']);
  sh.getRange(2,1,out.length,HEADERS.length).setValues(out);
  sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#2F5F3A').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  [5,6,8,9,10,12,13,14,15].forEach(c=> sh.getRange(2,c,out.length,1).setNumberFormat('dd-mmm-yyyy'));
  SpreadsheetApp.getUi().alert('dataDummy dimuat: '+out.length+' baris.');
}

function onOpen(){
  SpreadsheetApp.getUi().createMenu('📊 Dashboard')
    .addItem('Isi DATA 2026 (seed)','seedDataSheet')
    .addItem('Isi data2025 (faktual)','seedData2025')
    .addItem('Isi dataDummy (demo status)','seedDataDummy')
    .addToUi();
}