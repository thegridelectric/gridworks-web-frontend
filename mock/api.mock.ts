import { defineMock } from 'vite-plugin-mock-dev-server'

export default defineMock([{
  method: 'GET',
  url: '/api/v2/session',
  delay: 150,
  body: {
    userName: 'joe@2040energy.com',
    installations: [{
      id: 'a',
      displayName: 'Beech',
      houseAlias: 'beech',
    }, {
      id: 'b',
      displayName: 'Oak',
      houseAlias: 'oak',
    }]
  }
}, {
  url: '/api/v2/installations',
  delay: 1500,
  body: [
    { id: 'a', displayName: 'beech' },
    { id: 'b', displayName: 'oak' },
  ]
}, {
  url: '/api/v2/installations/a/snapshot',
  delay: 1500,
  body: {

  }
}]);
