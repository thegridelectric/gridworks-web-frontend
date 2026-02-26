import { defineMock } from 'vite-plugin-mock-dev-server'

export default defineMock({
  url: '/api/v2/installations',
//   status: 401,
  body: [
    { id: 'a', displayName: 'beech'},
    { id: 'b', displayName: 'oak'},
  ]
})