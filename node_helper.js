/********************
*  MMM-Ecowatt v1.0 *
*  Bugsounet        *
*  11/2022          *
********************/


var log = () => { /* do nothing */ };
var NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = NodeHelper.create({
  start: function() {
    this.init = false
    this.token = null
    this.data = {}
    this.timer = null
  },

  initialize: async function(payload) {
    console.log("[ECOWATT] MMM-Ecowatt Version:", require('./package.json').version, "rev:", require('./package.json').rev)
    this.config = payload
    if (payload.debug) {
      log = (...args) => { console.log("[ECOWATT]", ...args) }
    }

    log("Config:", this.config)
    if (!this.config.credentials) {
      this.sendSocketNotification("CREDENTIALS", { error: "", text: "Credentials manquant!" })
      return console.error("[ECOWATT] No credentials found!")
    }
    this.authorizationSeed = 'Basic ' + this.config.credentials
    await this.initFromCache()
    if (this.data.cache) this.sendSocketNotification("DATA", this.data)
    await this.initFromToken()
    if (this.token.error) return
    if (this.token) {
      if (!this.data.cache) {
        this.data = await this.getData()
        this.sendSocketNotification("DATA", this.data)
        this.autoUpdateData()
      } else {
        this.delayedUpdate()
      }
    }
    else {
      console.error("[ECOWATT] No token!") // must never happen !
      this.sendSocketNotification("ERROR", { error: "", text: "Pas de Token !?"})
    }
  },

  delayedUpdate: function() {
    log("Delayed update Pending...")
    clearTimeout(this.timer)
    this.timer= setTimeout(async () => {
      log("GetData updating... (delayed)")
      this.data = await this.getData()
      this.sendSocketNotification("DATA", this.data)
      log("GetData Update (delayed) Done.")
      this.autoUpdateData()
    }, 1000 * 60 * 5)
  },

  autoUpdateData: function() {
    log("AutoUpdate Pending...")
    clearInterval(this.timer)
    this.timer = setInterval(async () => {
      log("Updating...")
      this.data = await this.getData()
      this.sendSocketNotification("DATA", this.data)
      log("Update Done.")
    }, 1000 * 60 * 60)
  },

  socketNotificationReceived: function(noti, payload) {
    switch (noti) {
      case "INIT":
        this.initialize(payload)
        break
    }
  },

  /** Genreate Token and login **/
  login: async function () {
    return new Promise(async (resolve, reject) => {
      const response = await fetch('https://digital.iservices.rte-france.com/token/oauth/',
      {
        method: 'post',
        headers: {
          Authorization: this.authorizationSeed
        }
      })
      if (response.ok) {
        const data = await response.json()
        data.expires_at = Date.now() + ((data.expires_in - 60) * 1000)
        this.writeToken(data, resolve(data))
      } else {
        console.error("[ECOWATT] Error:", response.status, response.statusText)
        this.sendSocketNotification("ERROR", { error: response.status, text: response.statusText})
        resolve({ error: response.status, text: response.statusText})
      }
    })
  },

  initFromCache: async function() {
    var cache = path.resolve(__dirname, "dataCache.json")
    if (fs.existsSync(cache)) {
      this.data = JSON.parse(fs.readFileSync(cache))
      log("Data From File", this.data)
    } else {
      log("No cache found")
    }
  },

  writeCache: function(data) {
    var file = path.resolve(__dirname, "dataCache.json")
    data.cache = true
    fs.writeFileSync(file, JSON.stringify(data))
    log("Cache is written...")
  },

  initFromToken: async function() {
    var file = path.resolve(__dirname, "token.json")
    if (fs.existsSync(file)) {
      this.token = JSON.parse(fs.readFileSync(file))
      log("Token From File", this.token)
      if (this.isExpired()) {
        log("Token is expired!")
        this.token= await this.login()
      }
    } else {
      this.token= await this.login()
      if (!this.token.error) log("Create New Token", this.token)
    }
  },

  writeToken: function(output, cb = null) {
    var token = Object.assign({}, output)
    var file = path.resolve(__dirname, "token.json")
    fs.writeFileSync(file, JSON.stringify(token))
    log("Token is written...")
    log("Token expire", moment(token.expires_at).format("LLLL"))
    if (cb) cb()
  },

  isExpired: function() {
    return (Date.now() >= this.token.expires_at)
  },
  /** End Of Genreate Token and login **/

  /** fetch Datas **/
  getData: async function() {
    if (this.isExpired()) this.token= await this.login()
    if (!this.token) return console.error("[ECOWATT] token error!")
    return new Promise(async (resolve, reject) => {
      const response = await fetch('https://digital.iservices.rte-france.com/open_api/ecowatt/v4/signals',
      {
        headers: {
          Authorization: "Bearer " + this.token.access_token
        }
      })

      if (response.ok) {
        const result = await response.json()
        this.writeCache(result)
        resolve(result)
      } else {
        console.error("[ECOWATT] Error:", response.status, response.statusText)
        resolve({error: response.status, text: response.statusText})
      }
    })
  }
});
