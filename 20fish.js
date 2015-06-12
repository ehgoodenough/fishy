var Fish = new Mongo.Collection("fish")

if(Meteor.isServer) {
    Meteor.startup(function() {
        process.env.MONGO_URL = mongodb://consumer:random@ds041032.mongolab.com:41032/fishyid
    })
}

if(Meteor.isClient) {
    
    Meteor.startup(function() {
        GoogleMaps.load()
    })
    
    Session.set("location", null)
    
    Template.query.helpers({
        "fishes": function() {
            return Fish.find({}, {limit: 10})
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
