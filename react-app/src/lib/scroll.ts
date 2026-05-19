const MAX_HISTORY_SIZE = 10;
const state: Record<string, number> = {};
const queue: string[] = [];

export default (historySize: number = MAX_HISTORY_SIZE) => {
  const self = {
    set: (page: string, position: number): void => {
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
        if (removed !== undefined) {
          delete state[removed];
        }
      }
    },
    get: (page: string): number => {
      if (!(page in state)) {
        return 0;
      }
      return state[page];
    },
  };
  return self;
};
