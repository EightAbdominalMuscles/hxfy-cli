'use strict';

const axios = require('axios');

const BASE_URL = process.env.HXFY_CLI_BASE_URL ? process.env.HXFY_CLI_BASE_URL : "http://101.43.144.179:7001"

const request = axios.create({
    baseURL: BASE_URL,
    // 免费云MongoDB存储,响应慢
    timeout: 20000
})
request.interceptors.response.use(
    response => {
        return response.data
    },
    error => {
        return Promise.reject(error)
    }
)
module.exports = request;
