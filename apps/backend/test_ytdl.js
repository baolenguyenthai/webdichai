const youtubedl = require('youtube-dl-exec');

async function test() {
  const url = 'https://www.douyin.com/jingxuan?modal_id=7630796151238839602';
  try {
    const output = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });
    console.log("SUCCESS:");
    console.log("Title:", output.title);
    console.log("URL:", output.url);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

test();
