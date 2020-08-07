const MAX_HISTORY_SIZE = 10;
const state = {};
const queue = [];

export default (historySize = MAX_HISTORY_SIZE) => {
  const self = {
    set: (page, position) => {
      if (page in state) {
        if (queue[queue.length - 1] === page) {
          queue.pop();
        } else {
          const index = queue.indexOf(page);
          queue.splice(index, 1);
        }
      }
      queue.push(page);
      state[page] = position;
      if (historySize && queue.length > historySize) {
        const removed = queue.shift();
        delete state[removed];
      }
    },
    get: (page) => {
      if (!(page in state)) {
        return 0;
      }
      return state[page];
    },
  };
  return self;
};
