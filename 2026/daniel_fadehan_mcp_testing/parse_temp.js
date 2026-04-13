function smartParse(val) {
  if (val === '') return '';
  if (!isNaN(val)) return Number(val);
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  try {
    return JSON.parse(val);
  } catch(e) {
    return val;
  }
}
function smartStringify(val) {
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}
console.log(smartStringify("revenue"));
console.log(smartStringify(["MH", "TN"]));
console.log(smartStringify(2024));
console.log(smartParse("revenue"));
console.log(smartParse("[\"MH\", \"TN\"]"));
console.log(smartParse("2024"));
