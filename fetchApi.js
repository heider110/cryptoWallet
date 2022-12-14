exports.currency = function (num) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 6,
  }).format(num);
}

exports.percent = function (num) {
  return new Intl.NumberFormat('default', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,

  }).format(num / 100);

}

exports.longNumber = function (num) {
  return new Intl.NumberFormat('de-DE', {

  }).format(num);
}


exports.idIncrement = function (array) {
  let counter = 1;
  while (counter <= array.length) {
    counter++;
  }
  return counter


}

