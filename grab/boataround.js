const

categories	= {
	"sailing-yacht"	:10,
	"catamaran"		:20,
	"houseboat"		:20,
	"motor-boat"	:30,
	"motor-yacht"	:40,
	"gulet"		:50,
	"power-catamaran"	:60
},

shipclasses = {
	"11":	"category=sailing-yacht&cabins=1",
	"12":	"category=sailing-yacht&cabins=2-3",
	"13":	"category=sailing-yacht&cabins=3-5",
	"15":	"category=sailing-yacht&cabins=5-",
	"20":	"category=catamaran",
	"30":	"category=motor-boat",
	"40":	"category=motor-yacht",
	"50":	"category=power-catamaran",
	"60":	"category=gulet"
	
},

specs	= p => ({
	sleeps: Math.max(p.max_sleeps,p.max_people),
	cabins: p.double_cabins+p.triple_cabins,
	wc: p.toilets+p.electric_toilets,
	hp: p.engine
}),

//toShipclass	= (category,sleeps) => categories[category] + sleeps>>1,


coords	= c => c.map( f => f.toFixed(3) ).reverse().join(":"),
dest2tsv	= d => [coords(d.coords),d.count,d.name].join("\t"),
slug = name => name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g,'').replace(/\s+/g,'-'),

//str.replace(/[\u0300-\u036f]/g, "")

//api.boataround.com/v1/getMostPopularDestinations/en_EN
//api.boataround.com/v1/getDestinations/en_EN?destinationSearches=italy
destinations = json => json.data
	.map( $ => ({
		name		:$.name,
		coords	:$.coordinates,
		count		:$.total
	})),
	
//api.boataround.com/v1/locations/getAll?locationType=country
//api.boataround.com/v1/locations/getAll?locationType=region&destinations=italy
locations = json => json.data
	.map( $ => ({
		name		:$.name,
		regions	:destinations( get("getDestinations/en_EN?destinationSearches="+slug($.name)) )
	})),
	
//api.boataround.com/v1/search?destinations=emilia-romagna
boats = json => json.data[0].data && json.data[0].data
	.map( $ => ({
		ref		:$._id,
		slug		:$.slug,
		make		:$.parameters.year+" "+$.title.split(" | ")[0],
		name		:$.title.split(" | ")[1],
		//shipclass	:toShipclass($.category,$.max_sleeps||$.max_people),
		
		flag		:$.flag,
		charter	:$.charter,
		marina	:$.marina,
		coords	:$.coordinates,
		
		price		:($.priceFrom*7)|0,
		
		weeks		:$.old_id, /* mock */
		note		:[$.marina,$.charter].join(", "),
		
		specs		:specs($.parameters)
	})
),

price = json => json.data[0].data && Math.round(json.data[0].data[0].totalPrice),

pic	=  key => "https://imageresizer.yachtsbt.com/boats/"+key+"?method=fit&width=859&height=450&format=jpeg",
	
save = (name,data,asis) => {
	
	const a = document.createElement("a"),
		txt = asis ? data : JSON.stringify(data),
		textFile = window.URL.createObjectURL(new Blob([txt], {type: 'text/plain'}));
	
	a.href = textFile;
	a.download = name;
	a.textContent = name;
	//document.body.appendChild(document.createTextNode(txt));
	document.body.appendChild(a);
},

countries = "russia ukraine romania bulgaria turkey tunisia greece croatia italy france spain portugal uk belgium netherlands germany denmark norway sweden poland latvia lithuania estonia finland".split(" ");


export default {
	
	getCountries : _countries => 
		fetch("https://api.boataround.com/v1/getDestinations/en_EN?destinationSearches="+countries.join(","))
		.then(response => response.json()
			.then( json => save("countries.json", destinations(json)) )
		).catch(e=>console.log(e)),
	
	getDestinations : _countries => countries.map( country => 
		fetch("https://api.boataround.com/v1/locations/getAll?locationType=region&destinations="+country)
		.then( response => response.json()
			.then( json =>
				fetch("https://api.boataround.com/v1/getDestinations/en_EN?destinationSearches="+json.data.map( $ => $.slug ).join(","))
				.then(response => response.json()
					.then( json => save( country+".json", destinations(json) ) ) 
				).catch(e => console.log(e))
			)
		)
	),
	
	tsvDestinations : _countries =>
		Promise.all(
			countries.map( c => fetch("countries/"+c+".json").then( response => response.json().then( json => json.map( dest2tsv ).join("\n"))))
		).then( ts => save("destinations.tsv", ts.join("\n"), true)),
		
	getPics: slug => fetch("https://www.boataround.com/boat/"+slug)//,{mode:"no-cors"}
		.then( response => response.text().then( html=> html
				.match( /src="https:\/\/imageresizer.yachtsbt.com\/boats\/(.*)\?/g )
				.map(pic)
			)
		),
	//https://api.boataround.com/v1/price/bavaria-50-flurry?checkIn=2021-12-25&checkOut=2022-01-01
	
	convert:{
		boats, slug, price, pic,
		
		pics: txt => txt.split("\n").map(pic),
		
		shipclass: i => shipclasses[i],
		
		weeks: dates=>{
			const intervals = [];
			for(let i=0; ++i<dates.length;)
				intervals.push("checkIn="+dateStr(dates[i])+"&checkOut="+dateStr(dates[i+1]));
			console.log(intervals.join("; "));
			return intervals;
		}
	}
	
}
