import { defineMock } from 'vite-plugin-mock-dev-server'


function getTimes() {
  const now = new Date()
  const times = [];
  for (let i = 0; i < 10; i++) {
    times.push(new Date(now.getTime() - 60000*(10 - i)));
  }
  return times;
}

export default defineMock([{
  method: 'GET',
  url: '/api/v2/session',
  // status: 404,
  delay: 150,
  body: {
    userName: 'joe@2040energy.com',
    installations: [{
      id: 'a',
      displayName: 'beech'
    }, {
      id: 'b',
      displayName: 'oak'
    }]
  }
}, {
  url: '/api/v2/installations',
  delay: 1500,
    // status: 401,
  body: [
    { id: 'a', displayName: 'beech' },
    { id: 'b', displayName: 'oak' },
  ]
}, {
  url: '/api/v2/installations/a/snapshot',
  delay: 1500,
  body: {

  }
}, {
  url: '/api/v2/installations/a/readings',
  delay: 500,
  body: {
    times: getTimes(),
    ['hp-ewt']: [122, 121, 123, 120, 122,122, 121, 123, 120, 122],
    ['hp-lwt']: [142, 141, 143, 140, 142,142, 141, 143, 140, 142]
  }
}]);