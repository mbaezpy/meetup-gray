/**
 * Simple script that retrieves relevant information from 
 * meetup community. 
 * This code was written only for research purposes.
 *
 * @author: Marcos Baez <baez@disi.unitn.it>
 * 
 */
var page   = require('webpage').create(),
    system = require('system');

if (system.args.length === 1) {
  console.log('Usage: index.js <meetup URL>');
  phantom.exit();
}

var url = system.args[1];

page.open(url, function (status) {
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
    var community = page.evaluate(function () {
      var com = {};
      
      // retrieving general metadata
      com.name = $("#C_metabox span[itemprop=name]").text();
      com.url = $("#C_metabox span[itemprop=url]").text();
      com.locality = $("#C_metabox span[itemprop=addressLocality]").text();
      com.region = $("#C_metabox span[itemprop=addressRegion]").text();
      com.postalCode = $("#C_metabox span[itemprop=postalCode]").text();
      com.foundingDate = $("#C_metabox span[itemprop=foundingDate]").text();

      // list of topics of the community
      var list = [];
      $("#topicList14 a").each(function () {
        list.push($(this).text());
      });
      com.topics = list;

      // recommendations by meetup
      com.recommended = [];
      $("#meetup_serendipity ul li h5 a").each(function () {
        com.recommended.push({
          name: $(this).text(),
          url: $(this).attr("href")
        });
      });

      return com;
    });
    console.log(JSON.stringify(community));
    phantom.exit()
  });
});