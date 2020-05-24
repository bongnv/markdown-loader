# A webpack loader to load markdown files

Loaded data from a markdown file will be an object with fields:
- html: A string of rendered html form of the markdown content
- timeToRead: The number of minutes to read
- headings: An array of headings
- other fields from front matter
