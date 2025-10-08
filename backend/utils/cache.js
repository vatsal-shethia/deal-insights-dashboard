const store = new Map();

const storeDeal = (id, data) => store.set(id, data);
const getDeal = (id) => store.get(id);
const addToHistory = (dealSummary) => {
  if (!store.has('allDeals')) store.set('allDeals', []);
  store.get('allDeals').push(dealSummary);
};
const getAllDeals = () => store.get('allDeals') || [];

module.exports = { storeDeal, getDeal, addToHistory, getAllDeals };
