var Fish = new Mongo.Collection("fish")

if(Meteor.isServer) {
    
    Meteor.startup(function() {
        process.env.MONGO_URL = "mongodb://contributor:awesome@ds041032.mongolab.com:41032/fishyid"
        
        /*var url = "http://www.fishnet2.net/api/v1/occurrence"
        HTTP.call("get", url, {
            "api": "fishack2015",
            "t": "scomberomorus",
            "cols": [
                "ScientificName",
                "Latitude",
                "Longitude"
            ].join(",")
        }, function(error, results) {
            console.log(results, error)
            if(error == undefined) {
                var contents = results.content
                contents = contents.split(new RegExp("\r\n"))
                contents = contents.slice(1, -1)
                contents.map(function(content) {
                    var number = content.substring(content.indexOf(",") + 1)
                    var name = content.substring(0, content.indexOf(","))
                    console.log({
                        "name": name,
                        "number": number
                    })
                })
            }
        })*/
    })
}

if(Meteor.isClient) {
    
    Meteor.startup(function() {
        GoogleMaps.load()
    })
    
    Session.set("location", null)
    
    Template.query.helpers({
        "fishes": function() {
            return Fish.find({}, {limit: 200})
        },
        "location": function() {
            return Session.get("location")
        }
    })
    
    Template.query.events({
        "click button": function() {
            navigator.geolocation.getCurrentPosition(function(data) {
                Session.set("location", encodePolygon(extendPoint({
                    latitude: data.coords.latitude,
                    longitude: data.coords.longitude
                }, 100)))
            })
        },
        "submit form": function(event) {
            event.preventDefault()
            var address = {"address": event.target.address.value}
            new google.maps.Geocoder().geocode(address, function(data, status) {
                if(status == google.maps.GeocoderStatus.OK) {
                    Session.set("location", encodePolygon(extendPoint({
                        latitude: data[0].geometry.location.A,
                        longitude: data[0].geometry.location.F
                    }, 100)))
                }
            })
        }
    })
    
    Template.fish.helpers({
        "link": function() {
            var url = "http://www.fishbase.org/summary/"
            url += this.SpecCode
            return url
        },
        "name": function() {
            if(this.FBname) {
                return this.FBname
            }
        },
        "name": function() {
            var name = this.Genus
            if(this.Species) {
                name += " " + this.Species
            }
            return name
        },
        "image": function() {
            if(this.PicPreferredName) {
                var url = "http://fishbase.org/images/species/"
                url += this.PicPreferredName
                console.log(url)
                return url
            }
        }
    })
}

// extendPoint({latitude: Number, longitude: Number}, Number)
// Given a point with a latitude and longitude, this function
// returns an array of points in a square around that point,
// computing to adjust for the spherical shape of our world.

function extendPoint(point, radius) {
    var offset = {
        latitude: radius * (0.1 / 111.132),
        longitude: radius * (0.1 / ((Math.PI / 180) * 6378.1 * Math.cos(point.latitude)))
    }
    var polygon = []
    polygon.push({
        latitude: point.latitude + offset.latitude,
        longitude: point.longitude + offset.longitude
    })
    polygon.push({
        latitude: point.latitude + offset.latitude,
        longitude: point.longitude - offset.longitude
    })
    polygon.push({
        latitude: point.latitude - offset.latitude,
        longitude: point.longitude - offset.longitude
    })
    polygon.push({
        latitude: point.latitude - offset.latitude,
        longitude: point.longitude + offset.longitude
    })
    return polygon
}

// encodePolygon([{latitude: Number, longitude: Number} ...])
// Given an array of points with a latitude and longitude, this
// function returns a string of those points encoded into WKT.
// http://www.wikiwand.com/en/Well-known_text

function encodePolygon(polygon) {
    var string = "POLYGON(("
    for(var index in polygon) {
        var point = polygon[index]
        string += point.longitude + " "
                + point.latitude + ", "
    }
    string += polygon[0].longitude + " "
            + polygon[0].latitude + "))"
    return string
}

// scrapeSpeciesFromFishbase()
// This function will iterate through Fishbase to scrape
// and save any and all data about species of fish. It
// should be used with some caution.

function scrapeSpeciesFromFishbase() {
    if(Fish.find({}).count() == 0) {
        var url = "http://fishbase.ropensci.org/species"
        for(var count = 0; count < 32792; count += 12) {
            var response = HTTP.call("get", url, {
                "params": {
                    "offset": count,
                    "limit": 12
                }
            })
            var fishes = JSON.parse(response.content)["data"]
            for(var index in fishes) {
                var fish = fishes[index]
                for(var key in fish) {
                    if(fish[key] <= 0 || fish[key] == null) {
                        delete fish[key]
                    }
                }
                console.log(count + index + ":", fish["SpecCode"])
                Fish.upsert({
                    "SpecCode": fish["SpecCode"]
                }, {
                    "$set": fish
                })
            }
        }
    }
}
