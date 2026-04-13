const fs = require("fs");
const NOTES_FOLDER = "testovye_zameki";
const MAX_NAME_LENGTH = 20;

function saveNoteIntoJson(time, content, url, category) {
    const data = {
        time: time,
        content: content,
        url: url,
        category: category,
    };

    const jsonData = JSON.stringify(data, null, 2);

    const name = `${time}_${content}`.slice(0, MAX_NAME_LENGTH);

    fs.writeFile(`${name}.json`, jsonData, (err) => {
        if (err) throw err;
        console.log("JSON file has been saved.");
    });
}

// saveNoteIntoJson("23.11.2018", "abobaamogus67691337", "https:", "aboba");
