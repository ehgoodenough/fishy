var Fish = new Mongo.Collection("fish")

if(Meteor.isClient) {

    navigator.geolocation.getCurrentPosition(function(position) {
        console.log(position)
    })

    Session.set("colors", {})

    Template.output.helpers({
        fish: function () {
            var query = Fish.find({
                "length": Session.get("length"),
                "colors": {
                    $in: Object.keys(Session.get("colors"))
                }
            })
            return query
        }
    })

    Template.input.events({
        "change input[name=colors]": function(event) {
            var colors = Session.get("colors")
            if(event.target.checked) {
                colors[event.target.value] = true
            } else {
                delete colors[event.target.value]
            }
            console.log(Object.keys(colors))
            Session.set("colors", colors)
        }
    })
}

var FishData = [
    {
        name: "glowlight tetra",
        colors: ["red", "white"]
    },
    {
        name: "red piranha",
        colors: ["red", "white"]
    },
    {
        name: "cardinal tetra",
        colors: ["blue", "red", "yellow"]
    }
]

if(Meteor.isServer) {
    Meteor.startup(function () {
        Fish.remove({})
        for(var index in FishData) {
            var fish = FishData[index]
            Fish.insert(fish)
        }
    })
}
