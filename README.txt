This is the XUL Explorer, a simple IDE for developing firefox extensions and XULRunner applications.

This program was written by Mark Finkle quite awhile ago. He blogged about it sometimes http://starkravingfinkle.org/blog/xul-explorer/ and made a page for it in the MDN docs https://developer.mozilla.org/en-US/docs/XUL_Explorer

The latest release I know of is 1.0a1pre available at http://starkravingfinkle.org/projects/xulexplorer/

I used the windows installer and tried generating a skeleton application and extension but it wouldn't work. In the bug report Mr. Finkle said the issue came up because he packed the subfolders of the chrome directory into jar files. So, I unpacked the jar files and fixed the references in the manifest file. Now it generates extension and application skeletons.


The github is good for sharing code. If you use this and find bugs send a pull request or just fork it and do something awesome.