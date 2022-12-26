const fs = require("fs");

const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");
const pluginMarkdown = require("./config/markdownPlugin.js");
const Image = require("@11ty/eleventy-img");

async function stravaShortcode(activityId) {
  return `<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="${activityId}"></div><script src="https://strava-embeds.com/embed.js"></script>`
}

async function imageShortcode(src, alt, caption=null) {
  let metadata = await Image(src, {
    widths: [600],
    formats: ["png"],
    outputDir: "./_site/img/" 
  });

  let imageAttributes = {
    alt,
    loading: "lazy",
    decoding: "async",
  };

  // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
  const imageEl = Image.generateHTML(metadata, imageAttributes);

  if (!caption) {
    caption = alt;
  } 

  const markup = ["<figure>"]
  markup.push(imageEl)
  markup.push(`<figcaption>${caption}</figcaption>`)
  markup.push("</figure>")
  return markup.join("\n")
}

module.exports = function(eleventyConfig) {
  // Copy the `img` and `css` folders to the output
  // we don't need this since we're writing the compiled images directly into the output dir
  // eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js/*.js");


  eleventyConfig.addPassthroughCopy({
    "node_modules/lite-youtube-embed/src/lite-yt-embed.js": `js/lite-yt-embed.js`,
    "node_modules/lite-youtube-embed/src/lite-yt-embed.css": "css/lite-yt-embed.css",
 
  })

  // Copy CNAME to keep domain on re-deploy
  //eleventyConfig.addPassthroughCopy("CNAME");

  // Add plugins
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSyntaxHighlight);
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginMarkdown);

  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
  });

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  });

  // Get the first `n` elements of a collection.
  eleventyConfig.addFilter("head", (array, n) => {
    if(!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if( n < 0 ) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  // Return the smallest number argument
  eleventyConfig.addFilter("min", (...numbers) => {
    return Math.min.apply(null, numbers);
  });

  function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
  }

  eleventyConfig.addFilter("filterTagList", filterTagList)

  // Create an array of all tags
  eleventyConfig.addCollection("tagList", function(collection) {
    let tagSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagSet.add(tag));
    });

    return filterTagList([...tagSet]);
  });

  // Customize Markdown library and settings:
  let markdownLibrary = markdownIt({
    html: true,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "direct-link",
      symbol: "#"
    }),
    level: [1,2,3,4],
    slugify: eleventyConfig.getFilter("slugify")
  });
  eleventyConfig.setLibrary("md", markdownLibrary);

  // Override Browsersync defaults (used only with --serve)
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, browserSync) {
        const content_404 = fs.readFileSync('_site/404.html');

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.writeHead(404, {"Content-Type": "text/html; charset=UTF-8"});
          res.write(content_404);
          res.end();
        });
      },
    },
    ui: false,
    ghostMode: false,
    port: 3000
  });
  
  // elevenly-img
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);
  eleventyConfig.addJavaScriptFunction("image", imageShortcode);

  eleventyConfig.addNunjucksAsyncShortcode("strava", stravaShortcode);
  eleventyConfig.addLiquidShortcode("strava", stravaShortcode);
  eleventyConfig.addJavaScriptFunction("strava", stravaShortcode);

	eleventyConfig.addShortcode("youtubeEmbed", function(slug, label, startTime) {
		let readableStartTime = "";
		if(startTime) {
			let t = parseInt(startTime, 10);
			let minutes = Math.floor(t / 60);
			let seconds = t % 60;
			readableStartTime = `${minutes}m${seconds}s`;
		}
		let fallback = `https://i.ytimg.com/vi/${slug}/maxresdefault.jpg`;

		// hard-coded fallback
		if(slug === "pPkWxn0TF9w") {
			fallback = `https://img.youtube.com/vi/${slug}/hqdefault.jpg`;
		}

		return `<div><is-land on:visible import="/js/lite-yt-embed.js" class="fluid"><lite-youtube videoid="${slug}"${startTime ? ` params="start=${startTime}"` : ""} playlabel="Play${label ? `: ${label}` : ""}" style="background-image:url('${fallback}')">
	<a href="https://youtube.com/watch?v=${slug}" class="elv-externalexempt lty-playbtn" title="Play Video"><span class="lyt-visually-hidden">Play Video${label ? `: ${label}` : ""}</span></a>
</lite-youtube><a href="https://youtube.com/watch?v=${slug}${startTime ? `&t=${startTime}` : ""}">${label || "Watch on YouTube"}${readableStartTime ? ` <code>▶${readableStartTime}</code>` : ""}</a></is-land></div>`;
	});

  return {
    // Control which files Eleventy will process
    // e.g.: *.md, *.njk, *.html, *.liquid
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid",
      "11ty.js",
      "ejs"
    ],

    // Pre-process *.md files with: (default: `liquid`)
    markdownTemplateEngine: "njk",

    // Pre-process *.html files with: (default: `liquid`)
    htmlTemplateEngine: "njk",

    // -----------------------------------------------------------------
    // If your site deploys to a subdirectory, change `pathPrefix`.
    // Don’t worry about leading and trailing slashes, we normalize these.

    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for link URLs (it does not affect your file structure)
    // Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

    // You can also pass this in on the command line using `--pathprefix`

    // Optional (default is shown)
    pathPrefix: "/",
    // -----------------------------------------------------------------

    // These are all optional (defaults are shown):
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
