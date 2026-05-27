$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3OTkxNzYxMSwiZXhwIjoxNzgyNTA5NjExfQ.pZiB9AKrTUJAyvccR1oDsI8yvi2jA-RXkcgLCxtIzL4'
$headers = @{Authorization="Bearer $token"; 'Content-Type'='application/json'}
$base = 'https://tpqsstygpcqb.sealoshzh.site'

# Delete existing May 26 records (IDs 4-16 from previous import)
Write-Output "Deleting old May 26 records..."
4..16 | ForEach-Object {
  try { Invoke-RestMethod -Uri "$base/api/records/$_" -Method DELETE -Headers $headers | Out-Null } catch {}
}
Write-Output "Old records deleted."

# All records to import: date, description, car_type, plate_number, amount, used_by
$records = @(
  # === May 18 ===
  @{date='2026-05-18'; description='GASKET MAKER'; car_type='HILUX'; plate_number='T799DCV'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-18'; description='ARALDITE'; car_type='VELLFIRE'; plate_number='T161EJP'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-18'; description='AC GAS'; car_type='VELLFIRE'; plate_number='T161EJP'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-18'; description='COMPRESSOR'; car_type=''; plate_number=''; amount=300000; used_by='HAMIS'},
  @{date='2026-05-18'; description='RACK END'; car_type='SUBARU OUTBACK'; plate_number='T211EFS'; amount=60000; used_by='HAMIS'},
  @{date='2026-05-18'; description='STABLIZER BUSH'; car_type='SUBARU OUTBACK'; plate_number='T211EFS'; amount=20000; used_by='HAMIS'},
  @{date='2026-05-18'; description='AC GAS'; car_type='SUBARU'; plate_number='T319DUF'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-18'; description='SPARK SENSER'; car_type='PAJERO MINI'; plate_number='T361DZH'; amount=150000; used_by='HAMIS'},
  @{date='2026-05-18'; description='NOZZAL 2PC'; car_type='HILUX'; plate_number='T818DCU'; amount=900000; used_by='HAMIS'},
  @{date='2026-05-18'; description='CALIPER FIX'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=30000; used_by='JUMA'},
  @{date='2026-05-18'; description='PRESS CROSS MEMBER BUSH'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=20000; used_by='JUMA'},
  @{date='2026-05-18'; description='BATTERY N70L'; car_type='CANTER'; plate_number='T370EJN'; amount=0; used_by='HAMIS'},
  @{date='2026-05-18'; description='STARTER BRUSH AND TRANSPORT'; car_type='NOAH'; plate_number='T643DXL'; amount=50000; used_by='HAMIS'},
  @{date='2026-05-18'; description='CABLE TIE 5PCS'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=0; used_by='BAHATI'},
  @{date='2026-05-18'; description='ENGINE OIL 5W-30(GOLDEN)'; car_type='SUZUKI JIMMY'; plate_number='T601EDJ'; amount=0; used_by='HAMIS'},
  @{date='2026-05-18'; description='OIL FILTER'; car_type='SUZUKI JIMMY'; plate_number='T601EDJ'; amount=0; used_by='HAMIS'},
  @{date='2026-05-18'; description='CLEAN AC FILTER AND AIR FILTER'; car_type='SUZUKI JIMMY'; plate_number='T601EDJ'; amount=0; used_by='HAMIS'},
  @{date='2026-05-18'; description='GREECE'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=6000; used_by='JUMA'},
  @{date='2026-05-18'; description='PETROL'; car_type=''; plate_number=''; amount=10000; used_by='IBRAHIM'},
  @{date='2026-05-18'; description='PRESS CV JOINT'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=10000; used_by='JUMA'},
  @{date='2026-05-18'; description='PRESS BALL JOINT'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=10000; used_by='JUMA'},
  @{date='2026-05-18'; description='ARO 2PCS'; car_type='HILUX'; plate_number='T285DNR'; amount=20000; used_by='HAMIS'},
  @{date='2026-05-18'; description='NOZZAL 2PCS'; car_type='HILUX'; plate_number='T285DNR'; amount=1200000; used_by='HAMIS'},

  # === May 19 ===
  @{date='2026-05-19'; description='TRANSPORT'; car_type=''; plate_number=''; amount=10000; used_by='IKRAM'},
  @{date='2026-05-19'; description='TRANSPORT'; car_type=''; plate_number=''; amount=10000; used_by='YUSUFU'},
  @{date='2026-05-19'; description='POWDER'; car_type='ALPHARD'; plate_number='T161EJP'; amount=3000; used_by='KABWARI'},
  @{date='2026-05-19'; description='CONDENSOR FILTER'; car_type='SUBARU'; plate_number='T620ENH'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-19'; description='AC GAS'; car_type='SUBARU'; plate_number='T620ENH'; amount=60000; used_by='HAMIS'},
  @{date='2026-05-19'; description='AC FILTER'; car_type='SUBARU'; plate_number='T620ENH'; amount=0; used_by='HAMIS'},
  @{date='2026-05-19'; description='COMPRESSOR'; car_type='SUBARU'; plate_number='T620ENH'; amount=0; used_by='HAMIS'},
  @{date='2026-05-19'; description='ENGINE OIL 5W-30(GOLDEN)'; car_type='SUZUKI JIMMY'; plate_number='T601EDJ'; amount=70000; used_by='HAMIS'},
  @{date='2026-05-19'; description='AC PIPE'; car_type='SUBARU'; plate_number='T319DUF'; amount=40000; used_by='HAMIS'},
  @{date='2026-05-19'; description='AC GAS'; car_type='SUBARU'; plate_number='T319DUF'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-19'; description='CONDENSOR FILTER'; car_type='SUBARU'; plate_number='T319DUF'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-19'; description='COMPRESSOR OIL'; car_type='SUBARU'; plate_number='T319DUF'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-19'; description='COMPRESSOR OIL'; car_type='SUBARU'; plate_number='T620ENH'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-19'; description='TRANSPORT'; car_type=''; plate_number=''; amount=15000; used_by='HAMIS'},
  @{date='2026-05-19'; description='GEAR SELECTA'; car_type='ALPHARD'; plate_number='T161EJP'; amount=50000; used_by='HAMIS'},
  @{date='2026-05-19'; description='FUEL PUMP'; car_type='PRADO'; plate_number='T797EFB'; amount=50000; used_by='JUMA'},
  @{date='2026-05-19'; description='CARB CHOKE CLEANER'; car_type='ALPHARD'; plate_number='T161EJP'; amount=10000; used_by='HAMIS'},
  @{date='2026-05-19'; description='GASKET MAKER'; car_type='VANGUARD'; plate_number='T780EGX'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-19'; description='OVER TIME PAY DAY'; car_type=''; plate_number=''; amount=50000; used_by='BODA'},
  @{date='2026-05-19'; description='WATER'; car_type=''; plate_number=''; amount=25000; used_by='MASAI'},
  @{date='2026-05-19'; description='CABLE TIE'; car_type='VANGUARD'; plate_number='T780EGX'; amount=0; used_by='TATE'},
  @{date='2026-05-19'; description='OIL SWITCH'; car_type='VANGUARD'; plate_number='T780EGX'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-19'; description='GASKET MAKER'; car_type='VANGUARD'; plate_number='T780EGX'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-19'; description='ENGINE OIL 5W-30(GOLDEN) 1 LITRE'; car_type='VANGUARD'; plate_number='T780EGX'; amount=0; used_by='HAMIS'},
  @{date='2026-05-19'; description='AC GAS'; car_type='ALPHARD'; plate_number='T161EJP'; amount=30000; used_by='HAMIS'},

  # === May 20 ===
  @{date='2026-05-20'; description='BRAKE PAD (BACK)'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=0; used_by='BAHATI'},
  @{date='2026-05-20'; description='TRANSPORT NOZZAL'; car_type='HILUX'; plate_number='T818DCU'; amount=10000; used_by='HAMIS'},
  @{date='2026-05-20'; description='DIESEL'; car_type='HILUX'; plate_number='T818DCU'; amount=20000; used_by='HAMIS'},
  @{date='2026-05-20'; description='NOZZAL 4pcs'; car_type='HILUX'; plate_number='T818DCU'; amount=1800000; used_by='HAMIS'},
  @{date='2026-05-20'; description='PETROL'; car_type=''; plate_number=''; amount=10000; used_by='IBRAHIM'},
  @{date='2026-05-20'; description='VVTI SENSER AND TRANSPORT'; car_type='IST'; plate_number='T534DNG'; amount=70000; used_by='HAMIS'},
  @{date='2026-05-20'; description='ARO'; car_type='HILUX'; plate_number='T818DCU'; amount=10000; used_by='HAMIS'},
  @{date='2026-05-20'; description='MOTOR CYCLE PETROL'; car_type=''; plate_number=''; amount=17000; used_by='BODA'},
  @{date='2026-05-20'; description='TRANSPORT ABS'; car_type='MARCEDES'; plate_number=''; amount=10000; used_by='HAMIS'},
  @{date='2026-05-20'; description='OVERTIME'; car_type=''; plate_number=''; amount=20000; used_by='IBU, SAYONA'},
  @{date='2026-05-20'; description='FIX ARMATURE'; car_type='NOAH'; plate_number='T643DXL'; amount=40000; used_by='YUSUPH'},
  @{date='2026-05-20'; description='WATER'; car_type=''; plate_number=''; amount=5000; used_by='MASAI'},
  @{date='2026-05-20'; description='CARB CHOKE CLEANER'; car_type='MERCEDES'; plate_number=''; amount=10000; used_by=''},

  # === May 21 ===
  @{date='2026-05-21'; description='ABS'; car_type='MERCEDES'; plate_number=''; amount=300000; used_by=''},
  @{date='2026-05-21'; description='GEAR BOX OIL'; car_type='MERCEDES'; plate_number=''; amount=250000; used_by=''},
  @{date='2026-05-21'; description='FUNDI UMEME'; car_type='MERCEDES'; plate_number=''; amount=100000; used_by=''},
  @{date='2026-05-21'; description='STEERING POWER'; car_type='PRADO'; plate_number='T740DCJ'; amount=300000; used_by=''},
  @{date='2026-05-21'; description='HYDRAULIC 1 LITRE'; car_type='PRADO'; plate_number='T740DCJ'; amount=15000; used_by=''},
  @{date='2026-05-21'; description='REJATOR CAP AND UFUNDI'; car_type='ALPHARD'; plate_number='T789EDV'; amount=50000; used_by=''},
  @{date='2026-05-21'; description='RADIATOR COOLANT'; car_type='ALPHARD'; plate_number='T789EDV'; amount=15000; used_by=''},
  @{date='2026-05-21'; description='BULB'; car_type='COASTER'; plate_number='T951DXQ'; amount=4000; used_by=''},
  @{date='2026-05-21'; description='REJATOR CAP'; car_type='COASTER'; plate_number='T951DXQ'; amount=10000; used_by=''},
  @{date='2026-05-21'; description='GASKET MAKER'; car_type='COASTER'; plate_number='T951DXQ'; amount=5000; used_by=''},
  @{date='2026-05-21'; description='RADIATOR COOLANT'; car_type='COASTER'; plate_number='T951DXQ'; amount=20000; used_by=''},
  @{date='2026-05-21'; description='VVTI SENSER'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=50000; used_by=''},
  @{date='2026-05-21'; description='ABS SENSER'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=60000; used_by=''},
  @{date='2026-05-21'; description='OXYGEN SENSER'; car_type='X-TRAIL'; plate_number='T131EGP'; amount=50000; used_by=''},
  @{date='2026-05-21'; description='GEAR BOX OIL 4 LITRES'; car_type='CANTER'; plate_number='T912EJM'; amount=60000; used_by=''},
  @{date='2026-05-21'; description='OIL FILTER'; car_type='CANTER'; plate_number='T912EJM'; amount=60000; used_by=''},
  @{date='2026-05-21'; description='ENGINE OIL 15W-40(BLACK) 8 LITRES'; car_type='CANTER'; plate_number='T912EJM'; amount=0; used_by=''},
  @{date='2026-05-21'; description='NOZZAL SEAL 4pcs'; car_type='FORTUNER'; plate_number='T122DAG'; amount=50000; used_by=''},
  @{date='2026-05-21'; description='ENGINE OIL 15W-40(BLACK) 2 LITRES'; car_type='FORTUNER'; plate_number='T122DAG'; amount=0; used_by=''},
  @{date='2026-05-21'; description='TRANSPORT'; car_type=''; plate_number=''; amount=8000; used_by=''},
  @{date='2026-05-21'; description='WATER'; car_type=''; plate_number=''; amount=7000; used_by=''},

  # === May 22 ===
  @{date='2026-05-22'; description='TIE ROD END'; car_type='CANTER'; plate_number='T912EJM'; amount=150000; used_by='HAMIS'},
  @{date='2026-05-22'; description='PETROL'; car_type=''; plate_number=''; amount=20000; used_by='BODA'},
  @{date='2026-05-22'; description='WHEEL ALIGNMENT'; car_type='CANTER'; plate_number='T912EJM'; amount=40000; used_by='HAMIS'},
  @{date='2026-05-22'; description='PETROL AND PRESSURE TO CLEAN DIESEL TANK'; car_type='HILUX'; plate_number='T285DNR'; amount=15000; used_by='HAMIS'},
  @{date='2026-05-22'; description='FIX EXOST'; car_type='FORTUNER'; plate_number='T122DAG'; amount=50000; used_by='HAMIS'},
  @{date='2026-05-22'; description='ARALDITE'; car_type='FORTUNER'; plate_number='T122DAG'; amount=5000; used_by='KABWARI'},
  @{date='2026-05-22'; description='RADIATOR COOLANT'; car_type='CANTER'; plate_number='T912EJM'; amount=15000; used_by='HAMIS'},
  @{date='2026-05-22'; description='FUNDI'; car_type=''; plate_number=''; amount=100000; used_by='FUNDI'},
  @{date='2026-05-22'; description='UPLIFTING TYRE MACHINE AND HANDLE'; car_type='PRADO'; plate_number='T797EFB'; amount=120000; used_by='HAMIS'},
  @{date='2026-05-22'; description='ENGINE OIL 15W-40(BLACK)'; car_type='HILUX'; plate_number='T669EHP'; amount=0; used_by='JUMA'},
  @{date='2026-05-22'; description='AIR FILTER'; car_type='HILUX'; plate_number='T669EHP'; amount=0; used_by='JUMA'},
  @{date='2026-05-22'; description='AC FILTER'; car_type='HILUX'; plate_number='T669EHP'; amount=0; used_by='JUMA'},
  @{date='2026-05-22'; description='OIL FILTER'; car_type='HILUX'; plate_number='T669EHP'; amount=0; used_by='JUMA'},
  @{date='2026-05-22'; description='DIESEL FILTER COMPLETE'; car_type='HILUX'; plate_number='T285DNR'; amount=140000; used_by='HAMIS'},
  @{date='2026-05-22'; description='WATER'; car_type=''; plate_number=''; amount=5000; used_by='MASAI'},
  @{date='2026-05-22'; description='GEAR BOX OIL'; car_type='CANTER'; plate_number='T370EJN'; amount=60000; used_by='HAMIS'},
  @{date='2026-05-22'; description='OIL FILTER'; car_type='CANTER'; plate_number='T370EJN'; amount=60000; used_by='HAMIS'},
  @{date='2026-05-22'; description='ENGINE'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=2700000; used_by='HAMIS'},
  @{date='2026-05-22'; description='BODA FARE'; car_type=''; plate_number=''; amount=8000; used_by='BODA'},

  # === May 23 ===
  @{date='2026-05-23'; description='AC FILTER'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='AIR FILTER'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='ENGINE OIL 5W-30(GOLDEN) 4 LITRES'; car_type='VANGUARD'; plate_number='T951EAU'; amount=75000; used_by='JUMA'},
  @{date='2026-05-23'; description='OIL FILTER'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='BULB 4pcs'; car_type='VANGUARD'; plate_number='T951EAU'; amount=40000; used_by='HAMIS'},
  @{date='2026-05-23'; description='WISH BONE BUSH BIG'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='STABILIZER BUSH'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='STABLIZER LINK'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='PLACE WISH BONE BUSH'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='STUD AND NUT'; car_type='VANGUARD'; plate_number='T951EAU'; amount=0; used_by='JUMA'},
  @{date='2026-05-23'; description='GEAR BOX OIL'; car_type='CANTER'; plate_number='T370EJN'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-23'; description='ENGINE OIL 15W40 2L'; car_type='CANTER'; plate_number='T370EJN'; amount=36000; used_by='HAMIS'},
  @{date='2026-05-23'; description='GASKET MAKER'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=5000; used_by='HAMIS'},
  @{date='2026-05-23'; description='ENGINE OIL 5W30'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=75000; used_by='HAMIS'},
  @{date='2026-05-23'; description='GEAR BOX OIL 5 LITRES'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=75000; used_by='HAMIS'},
  @{date='2026-05-23'; description='CARB CHOKE CLEANER'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=10000; used_by='HAMIS'},
  @{date='2026-05-23'; description='RADIATOR COOLANT 4 LITRES'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=30000; used_by='HAMIS'},
  @{date='2026-05-23'; description='OXYGEN SENSER'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=50000; used_by='HAMIS'},
  @{date='2026-05-23'; description='TRANSPORT ENGINE'; car_type='VELLFIRE'; plate_number='T656EFU'; amount=15000; used_by='HAMIS'},
  @{date='2026-05-23'; description='WATER'; car_type=''; plate_number=''; amount=5000; used_by='MASAI'},

  # === May 25 ===
  @{date='2026-05-25'; description='BATTERY N70L'; car_type='MAZDA CX5'; plate_number='T666EHH'; amount=0; used_by='YUSUFU'},
  @{date='2026-05-25'; description='BRAKE PAD (BACK)'; car_type='HARRIER'; plate_number='OUTSIDE'; amount=40000; used_by='IKRAM'},
  @{date='2026-05-25'; description='OSHA'; car_type=''; plate_number=''; amount=100000; used_by='JUMA'},
  @{date='2026-05-25'; description='STABLIZER LINK'; car_type='VANGUARD'; plate_number='T951EAU'; amount=40000; used_by='JUMA'},
  @{date='2026-05-25'; description='STABILIZER BUSH'; car_type='VANGUARD'; plate_number='T951EAU'; amount=10000; used_by='JUMA'},
  @{date='2026-05-25'; description='CAMERA AND TRANSPORT'; car_type='VANGUARD'; plate_number='T951EAU'; amount=40000; used_by='IBRAHIM'},
  @{date='2026-05-25'; description='STUD AND NUT'; car_type='VANGUARD'; plate_number='T951EAU'; amount=10000; used_by='JUMA'},
  @{date='2026-05-25'; description='TRANSPORT'; car_type=''; plate_number=''; amount=8000; used_by='IKRAM'},
  @{date='2026-05-25'; description='PETROL MOTORCYCLE'; car_type=''; plate_number=''; amount=5000; used_by=''},
  @{date='2026-05-25'; description='WATER'; car_type=''; plate_number=''; amount=7000; used_by=''},

  # === May 26 (updated) ===
  @{date='2026-05-26'; description='LED BULB AND TRANSPORT'; car_type='VANGUARD'; plate_number='T951EAU'; amount=90000; used_by=''},
  @{date='2026-05-26'; description='CAR WASH'; car_type='HILUX'; plate_number='T818DCU'; amount=10000; used_by='HAMIS'},
  @{date='2026-05-26'; description='PETROL'; car_type='SUZUKI'; plate_number=''; amount=30000; used_by='HAMIS'},
  @{date='2026-05-26'; description='SPARK PLUG 4'; car_type='SUZUKI'; plate_number=''; amount=5000; used_by='HAMIS'},
  @{date='2026-05-26'; description='OVERPULLATOR'; car_type='HILUX'; plate_number='T7777DLK'; amount=250000; used_by='HAMIS'},
  @{date='2026-05-26'; description='EXPANSION'; car_type='HILUX'; plate_number='T7777DLK'; amount=60000; used_by=''},
  @{date='2026-05-26'; description='COMPRESSOR OIL'; car_type='HILUX'; plate_number='T7777DLK'; amount=5000; used_by=''},
  @{date='2026-05-26'; description='AC GAS'; car_type='HILUX'; plate_number='T7777DLK'; amount=120000; used_by=''},
  @{date='2026-05-26'; description='OXYGEN SENSER'; car_type='ALPHARD NEW'; plate_number='T656EFU'; amount=60000; used_by=''},
  @{date='2026-05-26'; description='GASKET MAKER'; car_type=''; plate_number=''; amount=5000; used_by=''},
  @{date='2026-05-26'; description='DRIVER'; car_type=''; plate_number=''; amount=10000; used_by=''},
  @{date='2026-05-26'; description='ENGINE OIL'; car_type='HILUX'; plate_number='T818DCU'; amount=32000; used_by=''},
  @{date='2026-05-26'; description='FUNDI'; car_type=''; plate_number=''; amount=100000; used_by=''}
)

$count = 0
foreach ($r in $records) {
  $body = $r | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/api/records" -Method POST -Body $body -Headers $headers
  $count++
  if ($count % 20 -eq 0) { Write-Output "Imported $count records..." }
}

Write-Output "All $count records imported!"

# Set deposits
$deposits = @(
  @{date='2026-05-19'; amount=1000000},
  @{date='2026-05-20'; amount=2740000},
  @{date='2026-05-21'; amount=1470000},
  @{date='2026-05-26'; amount=777000}
)

foreach ($d in $deposits) {
  $depBody = $d | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/api/deposit" -Method PUT -Body $depBody -Headers $headers
  Write-Output "Deposit $($d.date): $($d.amount)"
}

Write-Output "`nDone!"
