/*********************
*  MMM-Ecowatt v1.0  *
*  Bugsounet         *
*  12/2022           *
**********************/

Module.register("MMM-Ecowatt", {
  defaults: {
    debug: false,
    credentials: null,
    zoom: 100
  },

  start: function () {
    this.color = {
      1: "green",
      2: "orange",
      3: "red"
    }
    this.signals = null
  },

  getStyles: function () {
    return [
      "MMM-Ecowatt.css"
    ]
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    wrapper.id = "MMM-Ecowatt"
    wrapper.style.zoom = this.config.zoom+"%"

    var days = document.createElement("div")
    days.id = "MMM-Ecowatt-days_container"
    wrapper.appendChild(days)
      var day0 = document.createElement("div")
      day0.id= "MMM-Ecowatt-day0"
        var img0 = document.createElement("div")
        img0.id = "MMM-Ecowatt-img0"
        day0.appendChild(img0)
      days.appendChild(day0)
      var day1 = document.createElement("div")
      day1.id= "MMM-Ecowatt-day1"
        var img1 = document.createElement("div")
        img1.id = "MMM-Ecowatt-img1"
        day1.appendChild(img1)
      days.appendChild(day1)
      var day2 = document.createElement("div")
      day2.id= "MMM-Ecowatt-day2"
        var img2 = document.createElement("div")
        img2.id = "MMM-Ecowatt-img2"
        day2.appendChild(img2)
      days.appendChild(day2)
      var day3 = document.createElement("div")
      day3.id= "MMM-Ecowatt-day3"
        var img3 = document.createElement("div")
        img3.id = "MMM-Ecowatt-img3"
        day3.appendChild(img3)
      days.appendChild(day3)

    var message = document.createElement("div")
    message.id = "MMM-Ecowatt-message"
    message.textContent = "Chargement..."
    wrapper.appendChild(message)

    var values = document.createElement("div")
    values.id = "MMM-Ecowatt-values"

    for (let hour = 0; hour <= 24; hour++) {
      var signalTable = document.createElement("div")
      signalTable.id = "MMM-Ecowatt-signal"+hour
      values.appendChild(signalTable)
    }
    wrapper.appendChild(values)

    var lastUpdate = document.createElement("div")
    lastUpdate.id = "MMM-Ecowatt-update"
    wrapper.appendChild(lastUpdate)
    return wrapper
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "DATA":
        console.log("DATA:", payload)
        this.signals = payload
        if (payload.error) this.displayError(payload)
        else this.updateValues()
        break
      case "ERROR":
        this.displayError(payload)
        break

    }
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.sendSocketNotification('INIT', this.config)
        break
    }
  },

  displayError: function(message) {
    var Displayer = document.getElementById("MMM-Ecowatt-message")
    Displayer.textContent= "Erreur "+ message.error + ": " + message.text
  },

  updateValues: function() {
    this.signals.signals.forEach((signal,nb) => {
      var img = document.getElementById("MMM-Ecowatt-img"+nb)
      var date = document.getElementById("MMM-Ecowatt-date"+nb)
      img.className = "background " + this.color[signal.dvalue]
      img.innerHTML = moment(signal.jour).format("dddd").toUpperCase() + "<br />" + moment(signal.jour).format("Do MMM")
      if (nb == 0) { // get data from the first day
        var message = document.getElementById("MMM-Ecowatt-message")
        var lastUpdate = document.getElementById("MMM-Ecowatt-update")
        lastUpdate.textContent = "Données du " + moment(signal.GenerationFichier).format("dddd Do MMMM HH:MM")
        message.textContent = signal.message
        signal.values.forEach(value => {
          var signalTable = document.getElementById("MMM-Ecowatt-signal"+value.pas)
          signalTable.className = this.color[value.hvalue]
          signalTable.textContent = (value.pas % 6 == 0) ? value.pas + "h" : ""
          if (value.pas == 23) {
            signalTable = document.getElementById("MMM-Ecowatt-signal24")
            signalTable.className = this.color[value.hvalue]
            signalTable.textContent = "24h"
          }
        })
      }
    })
  }

})
