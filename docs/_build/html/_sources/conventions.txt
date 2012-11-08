Conventions
===========

Angles
------

Angles in MathJS are assumed to be in radians. If you are working in degrees, you will need to convert angles to radians before passing them into MathJS functions.

Results
-------

A function will have an optional ``result`` parameter if it expects to return a matrix. If you supply a matrix, the result will be stored there as well as being returned by the function. You will need to make sure that the matrix you supply is the correct size and dimension to accomodate the expected result.

If you do not supply a matrix for the ``result`` parameter, a new matrix will be created and returned.