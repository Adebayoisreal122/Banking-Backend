const generateAccountNumber = () => {
  return '10' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
};

const calculateLoanPayment = (principal, annualRate, months) => {
  const monthlyRate = annualRate / 100 / 12;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  return parseFloat(payment.toFixed(2));
};

module.exports = {
  generateAccountNumber,
  calculateLoanPayment
};