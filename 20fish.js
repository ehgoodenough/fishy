var Fish = new Mongo.Collection("fish")

if(Meteor.isClient) {

    Meteor.startup(function() {
        GoogleMaps.load()
    })

    Session.set("view", 1)
    Session.set("location", null)

    Tracker.autorun(function() {
        var location = Session.get("location")
        if(location != undefined) {
            Meteor.call("poll", location)
        }
    })

    Template.router.helpers({
        view: function(view) {
            return Session.get("view")
        }
    })

    Template.location.helpers({
        "fish": function() {
            return Fish.find({}, {sort: {number: 1}, limit: 10})
        }
    })

    Template.location.events({
        "click button": function() {
            navigator.geolocation.getCurrentPosition(function(result) {
                var location = encodeLocation(extendLocation({
                    latitude: result.coords.latitude,
                    longitude: result.coords.longitude,
                    radius: 100
                }))
                Session.set("location", location)
                //Session.set("view", 2)
            })
        },
        "submit form": function(event) {
            event.preventDefault()
            var address = {"address": event.target.address.value}
            new google.maps.Geocoder().geocode(address, function(results, status) {
                if(status == google.maps.GeocoderStatus.OK) {
                    var location = encodeLocation(extendLocation({
                        latitude: results[0].geometry.location.A,
                        longitude: results[0].geometry.location.F,
                        radius: 100
                    }))
                    Session.set("location", location)
                    //Session.set("view", 2)
                }
            })
        }
    })
}

function extendLocation(point) {
    var offset = {
        longitude: point.radius * (0.1 / ((Math.PI / 180) * 6378.1 * Math.cos(point.latitude))),
        latitude: point.radius * (0.1 / 111.132)
    }
    var points = []
    points.push({
        latitude: point.latitude + offset.latitude,
        longitude: point.longitude + offset.longitude
    })
    points.push({
        latitude: point.latitude + offset.latitude,
        longitude: point.longitude - offset.longitude
    })
    points.push({
        latitude: point.latitude - offset.latitude,
        longitude: point.longitude - offset.longitude
    })
    points.push({
        latitude: point.latitude - offset.latitude,
        longitude: point.longitude + offset.longitude
    })
    return points
}

function encodeLocation(points) {
    var string = "POLYGON(("
    for(var index in points) {
        var point = points[index]
        string += point.longitude + " " + point.latitude + ", "
    }
    string += points[0].longitude + " " + points[0].latitude + "))"
    return string
}

if(Meteor.isServer) {

    Meteor.startup(function() {
        Fish.remove({})
    })

    Meteor.methods({
        "poll": function(location) {
            Fish.remove({})
            HTTP.call("get", "http://www.fishnet2.net/api/v1/taxa/?api=fishack2015&cols=ScientificName&p=" + location, function(error, results) {
                if(error == undefined) {
                    var contents = results.content.split(new RegExp("\r\n"))
                    contents = contents.slice(1, -1)
                    contents.map(function(content) {
                        var number = content.substring(content.indexOf(",") + 1)
                        var name = content.substring(0, content.indexOf(","))
                        var _id = Fish.insert({
                            "name": name,
                            "number": number,
                            "images": new Array()
                        })
                        Meteor.call("decorate", _id, name)
                    })
                }
            })
        },
        "decorate": function(_id, name) {
            name = name.split(" ")
            var request = "http://fishbase.ropensci.org/species?genus=" + name[0]
            if(name[1] != undefined) {
                request += "&species=" + name[1]
            }
            HTTP.call("get", request, function(error, results) {
                if(error == undefined) {
                    results.data.data.map(function(result) {
                        if(result.PicPreferredName != undefined) {
                            Fish.update(_id, {
                                "$push": {
                                    "images": "http://fishbase.org/images/species/" + result.PicPreferredName
                                }
                            })
                        }
                    })
                }
            })
            findImages(name, function(images) {
                for(index in images) {
                    var image = images[index]
                    Fish.update(_id, {
                        "$push": {
                            "images": image
                        }
                    })
                }
            })
        }
    })
}

function findImages(query, callback) {
    var url = 'http://ajax.googleapis.com/ajax/services/search/images'
    var query = 'v=1.0&imgsz=large&rsz=5&q=' + encodeURIComponent(query)
    HTTP.call("get", url + '?' + query, function(error, response) {
        if(error == undefined) {
            callback(response.data.responseData.results.map(function(image) {return image.url}))
        }
    });
}
