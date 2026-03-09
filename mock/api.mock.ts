import { defineMock } from 'vite-plugin-mock-dev-server'

function subtractTime(dt: Date, seconds: number) {
  return new Date(dt.getTime() - 1000*seconds);
}

function buildReadingResponse() {
  const now = new Date()
  const times = [];
  for (let i = 0; i < 10; i++) {
    times.push(subtractTime(now, 60 * (9 - i)));
  }

  return {
    startTime: subtractTime(now, 540),
    endTime: now,
    times,
    dataGaps: [
      { start: subtractTime(now, 180), end: subtractTime(now, 90) }
    ],
    data: {
      ['hp-ewt']: [122, 121, 123, 120, 122,122, 121, 123, 120, 122],
      ['hp-lwt']: [142, 141, 143, 140, 142,142, 141, 143, 140, 142],
      ['hp-odu-pwr']: [3,3.1,2.9,3,2.9,3,3.1,2.9,3,2.9],
    }
  }
}

function getTimes() {
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
      displayName: 'Beech'
    }, {
      id: 'b',
      displayName: 'Oak'
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
  body: buildReadingResponse(),
}]);