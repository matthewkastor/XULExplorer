This is the XUL Explorer, a simple IDE for developing firefox extensions and XULRunner applications.

This program was written by Mark Finkle quite awhile ago. He blogged about it sometimes http://starkravingfinkle.org/blog/xul-explorer/ and made a page for it in the MDN docs https://developer.mozilla.org/en-US/docs/XUL_Explorer

The latest release I know of is 1.0a1pre available at http://starkravingfinkle.org/projects/xulexplorer/
XUL Explorer runs on XULRunner 1.9.0.3 This repo contains the windows version. If you want to try it on other operating systems just download the XULRunner 1.9.0.3 for your system and replace the xulrunner folder in this project with the one you download. You can delete the xulrunner.exe as well. Then launch the application by calling the xulrunner executable like 

xulrunner/xulrunner -app application.ini

from this directory.

I used the windows installer and tried generating a skeleton application and extension but it wouldn't work. In the bug report Mr. Finkle said the issue came up because he packed the subfolders of the chrome directory into jar files. So, I unpacked the jar files and fixed the references in the manifest file. Now it generates extension and application skeletons.


The github is good for sharing code. If you use this and find bugs send a pull request or just fork it and do something awesome.