Annotater
===========

- This extension lets you annotate Jupyter notebook cells / code and store the annotations in an elastic search index.
- This adds two buttons to your Jupyter notebook toolbar: Annotate Cell and Annotate Selection
- Currently WIP, no elastic search configuration and cannot use secure elastic search yet.


Installation
------------

The extension can be installed with the nice UI available on jupyter_nbextensions_configurator website, which also allows to enable/disable the extension.


Testing
-------

Use a code cell with

```python
%%javascript
require("base/js/utils").load_extensions("annotater/annotater")
```


Automatic load
--------------

You may also automatically load the extension for any notebook via

```bash
jupyter nbextension enable annotater/annotater
```

