// Extract plate → customer mapping from JXCDB.mdb
const MDBReader = require('mdb-reader').default;
const fs = require('fs');
const path = require('path');

const mdbPath = 'D:/qerwsoft/qwcar/main/JXCDB.mdb';
const buffer = fs.readFileSync(mdbPath);
const reader = new MDBReader(buffer);

// 1. Load tCustomer for ID → Name mapping
const custNames = {};
const tCustomer = reader.getTable('tCustomer');
const custRows = tCustomer.getData();
for (const row of custRows) {
  custNames[row.fID] = (row.fName || '').toString().trim();
}
console.log(`tCustomer: ${custRows.length} rows`);

// 2. Load tCustomerCar for plate → customerID + model
const map = {};
const tCar = reader.getTable('tCustomerCar');
const carRows = tCar.getData();
let skipped = 0;
for (const row of carRows) {
  const plate = (row.fCarNo || '').toString().trim().toUpperCase();
  const model = (row.fCarModel || '').toString().trim();
  const custId = row.fCustomerID;
  if (!plate || plate.length < 3) { skipped++; continue; }
  const customer = custNames[custId] || '';
  map[plate] = { customer, model, tel: '' };
}
console.log(`tCustomerCar: ${carRows.length} rows, ${Object.keys(map).length} valid, ${skipped} skipped (no plate)`);

// 3. Load tBillOrder for plates not in tCustomerCar
const tOrder = reader.getTable('tBillOrder');
const orderRows = tOrder.getData();
let addedFromOrders = 0;
for (const row of orderRows) {
  const plate = (row.fCustomerCarNo || '').toString().trim().toUpperCase();
  const customer = (row.fCustomerName || '').toString().trim();
  const model = (row.fCustomerCarModel || '').toString().trim();
  if (!plate || plate.length < 3) continue;
  if (!customer) continue;
  if (map[plate]) continue; // already have it
  map[plate] = { customer, model, tel: '' };
  addedFromOrders++;
}
console.log(`tBillOrder: ${orderRows.length} rows, added ${addedFromOrders} new plates`);

// 4. Remove entries without customer name
let removedEmpty = 0;
for (const [plate, info] of Object.entries(map)) {
  if (!info.customer) { delete map[plate]; removedEmpty++; }
}
console.log(`Removed ${removedEmpty} entries with no customer`);

// 5. Sort by plate key
const sorted = {};
Object.keys(map).sort().forEach(k => { sorted[k] = map[k]; });

// 6. Write
const outPath = path.join(__dirname, 'plate_customers.json');
fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2), 'utf-8');
console.log(`\nWritten ${Object.keys(sorted).length} entries to plate_customers.json`);

// Show samples
const entries = Object.entries(sorted);
console.log('\nFirst 10 entries:');
entries.slice(0, 10).forEach(([plate, info]) => {
  console.log(`  ${plate} → ${info.customer}  (${info.model})`);
});
console.log('\nLast 5 entries:');
entries.slice(-5).forEach(([plate, info]) => {
  console.log(`  ${plate} → ${info.customer}  (${info.model})`);
});
