const request = require('@hxfy-cli/request')

module.exports = async function () {
  return request({
    url: '/project/template'
  })
}
