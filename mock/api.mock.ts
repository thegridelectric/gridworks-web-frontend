import { defineMock } from 'vite-plugin-mock-dev-server'

export default defineMock([{
  method: 'GET',
  url: '/api/v2/session',
  delay: 150,
  body: {
    userName: 'joe@2040energy.com',
    installations: [],
  }
}]);
