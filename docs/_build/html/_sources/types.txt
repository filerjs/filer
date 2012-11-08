Types
=====

Matrix
------

Creates a new matrix.

.. js:class:: Matrix(r, c)

  :param number r: row dimension
  :param number c: column dimension

.. js:class:: Matrix(values)

  :param Array values: an array of lists containing initial values, one for each matrix row

Vector
------

Creates a new column vector. A vector is represented by a single-column Matrix.

.. js:class:: Vector(d)

  :param number d: dimension

.. js:class:: Vector(values)

  :param Array values: an array of initial values

Transform
---------

Creates a new affine transform Matrix. A transform is represented by a ``d+1`` square Matrix.

.. js:class:: Transform(d)

  :param number d: dimension

Quaternion
----------

Creates a new quaternion. A quaternion is represented by a 4-dimensional Vector.

.. js:class:: Quaternion()

.. js:class:: Quaternion(values)

  :param Array values: an array of initial values

Frustum
-------

Creates a new frustum.

.. js:class:: Frustum(left, right, bottom, top, near, far)

Perspective
-----------

Creates a new perspective projection matrix.

.. js:class:: Perspective(fovy, aspect, near, far)

Orthographic
------------

Creates a new orthographic projection matrix.

.. js:class:: Orthographic(left, right, bottom, top, near, far)

LookAt
------

Creates a new look-at matrix.

.. js:class:: LookAt(eye, center, up)