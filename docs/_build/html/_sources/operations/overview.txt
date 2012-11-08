Operations
==========

.. js:function:: add(a1, a2[, result])

  :param Matrix a1: first operand
  :param Matrix a2: second operand
  :param Matrix result: result buffer
  :returns: result

  Adds two buffers of the same size.

.. js:function:: subtract(a1, a2[, result])

  :param Matrix a1: first operand
  :param Matrix a2: second operand
  :param Matrix result: result buffer
  :returns: result

  Subtracts two buffers of the same size.

.. js:function:: scale(a, s[, result])

  :param Matrix a: buffer
  :param number s: scalar
  :param Matrix result: result
  :returns: result

  Scales a buffer by multiplying each component by a scalar.

.. js:function:: equal(a1, a2[, e])

  :param Matrix a1: first operand
  :param Matrix a2: second operand
  :param number e: comparision tolerance, defaults to ``10E-5``
  :returns: true if operands are equal (within tolerance), false otherwise

  Compares two buffers component-wise for equality. Differences smaller than ``e`` are ignored.

.. js:function:: clone(a[, result])

  :param Matrix a: buffer
  :param Matrix result: result buffer

  Creates a component-wise copy of a buffer.

.. js:function:: clear(a[, s])

  :param Matrix a: buffer
  :param number s: scalar, defaults to 0

  Clears a buffer by writing a scalar into each component.

.. js:function:: toMathML(a)

  :param Matrix a: buffer

  Converts a buffer to MathML representation.

.. js:function:: toString(a)

  :param Matrix a: buffer

  Converts a buffer to string representation.

Vector
------

.. js:function:: set(v, values)

  :param Vector v: vector
  :param Array values: array of values
  :returns: ``v``

.. js:function:: length(v)

  :param Vector v: vector
  :returns: length of ``v``

.. js:function:: length2(v)

  :param Vector v: vector
  :returns: squared length of ``v``

.. js:function:: dot(v1, v2)

  :param Vector v1: first vector
  :param Vector v2: second vector
  :returns: inner product of ``v1`` and ``v2``

.. js:function:: negate(v[, result])

  :param Vector v: vector
  :param Vector result: result
  :returns: negation of ``v``

.. js:function:: limit(v, s[, result])

  :param Vector v: vector
  :param number s: scalar limit
  :returns: ``v`` resized to have length at most ``s``

.. js:function:: normalize(v[, result])

  :param Vector v: vector
  :param Vector result: result
  :returns: a unit vector in the direction of ``v``

.. js:function:: distance(v1, v2)

  :param Vector v1: origin vector
  :param Vector v2: target vector
  :returns: the distance from v1 to v2

.. js:function:: angle(v1, v2)

  :param Vector v1: first vector
  :param Vector v2: second vector
  :returns: the angle betwen ``v1`` and ``v2``

.. js:function:: lerp(v1, v2, s[, result])

  :param Vector v1: origin vector
  :param Vector v2: target vector
  :param number s: interpolation scalar
  :param Vector result: result
  :returns: interpolation from ``v1`` to ``v2`` by s

.. js:function:: direction(v1, v2[, result])

  :param Vector v1: origin vector
  :param Vector v2: target vector
  :param Vector result: result
  :returns: unit vector pointing from ``v1`` to ``v2``

.. js:function:: extract(v, offset, length[, result])

  :param Vector v: vector
  :param number offset: offset from the start ov ``v``
  :param number length: number of elements to extract
  :param Vector result: result
  :returns: ``length`` elements of ``v``, starting from ``offset``

.. js:function:: zero(v)

  :param Vector v: vector
  :returns: ``v`` with all components 0

.. js:function:: zero(d)

  :param number d: dimension
  :returns: a new ``Vector`` with all components 0

.. js:function:: one(v)

  :param Vector v: vector
  :returns: ``v`` with all components 1

.. js:function:: one(d)

  :param number d: dimension
  :returns: a new ``Vector`` with all components 1

Vector2
-------

.. js:function:: x([result])

  :param Vector result: result
  :returns: 2-dimensional y unit vector (1, 0)

.. js:function:: y([result])

  :param Vector result: result
  :returns: 2-dimensional y unit vector (0, 1)

.. js:function:: u([result])

  :param Vector result: result
  :returns: 2-dimensional u unit vector (1, 0)

.. js:function:: v([result])

  :param Vector result: result
  :returns: 2-dimensional v unit vector (0, 1)

Vector3
-------

.. js:function:: cross(v1, v2[, result])

  :param Vector v1: first vector
  :param Vector v2: second vector
  :param Vector result: result
  :returns: outer product of ``v1`` and ``v2``

.. js:function:: unproject(v, view, projection, viewport[, result])

  .. note:: Not yet implemented

  :param Vector v: screen space vector
  :param Matrix view: view matrix
  :param Matrix projection: projection matrix
  :param Array viewport: viewport parameters, as ``[x, y, width, height]``
  :param Vector result: result
  :returns: vector projected from screen space to object space

.. js:function:: x([result])

  :param Vector result: result
  :returns: 3-dimensional y unit vector (1, 0, 0)

.. js:function:: y([result])

  :param Vector result: result
  :returns: 3-dimensional y unit vector (0, 1, 0)

.. js:function:: z([result])

  :param Vector result: result
  :returns: 3-dimensional z unit vector (0, 0, 1)

Vector4
--------

.. js:function:: x([result])

  :param Vector result: result
  :returns: 4-dimensional y unit vector (1, 0, 0, 0)

.. js:function:: y([result])

  :param Vector result: result
  :returns: 4-dimensional y unit vector (0, 1, 0, 0)

.. js:function:: z([result])

  :param Vector result: result
  :returns: 4-dimensional z unit vector (0, 0, 1, 0)

.. js:function:: w([result])

  :param Vector result: result
  :returns: 4-dimensional w unit vector (0, 0, 0, 1)

Quaternion
----------

.. js:function:: inverse(q[, result])

  :param Quaternion q: quaternion
  :param Quaternion result: result
  :returns: inverse of ``q``

.. js:function:: conjugate(q[, result])

  :param Quaternion q: quaternion
  :param Quaternion result: result
  :returns: conjugate of ``q``

.. js:function:: identity([result])

  :param Quaternion result: result
  :returns: the identity quaternion (0, 0, 0, 1)

.. js:function:: slerp(q1, q2, s[, result])

  :param Quaternion q1: origin quaternion
  :param Quaternion q2: target quaternion
  :param number s: interpolation scalar
  :param Quaternion result: result
  :returns: spherical linear interpolation between ``q1`` and ``q2``

.. js:function:: rotation(v1, v2[, result])

  .. note:: Not yet implemented

  :param Vector v1: origin vector
  :param Vector v2: target vector
  :param Quaternion result: result
  :returns: quaternion of rotation between two 3-dimensional vectors

.. js:function:: toAxisAngle(q[, result])

  :param Quaternion q: quaternion
  :param Vector result: result
  :returns: axis-angle representated as a 3-dimensional vector

.. js:function:: fromAxisAngle(v[, result])

  :param Vector v: vector
  :param Quaternion result: result
  :returns: quaternion computed from axis-angle as a 3-dimensional vector

Matrix
------

.. js:function:: multiply(m1, m2[, reuslt])

  :param Matrix m1: first matrix
  :param Matrix m2: second matrix
  :param Matrix result: result
  :returns: the matrix product of ``m1`` with ``m2``

.. js:function:: inverse(m[, result])

  .. note:: Valid for square matrices only

  :param Matrix m: square matrix
  :param Matrix result: result
  :returns: inverse of ``m``

.. js:function:: transpose(m[, result])

  .. note:: Implemented for square matrices only

  :param Matrix m: matrix
  :param Matrix result: result
  :returns: transpose of ``m``

.. js:function:: identity(m)

  .. note:: Valid for square matrices only

  :param Matrix m: square matrix
  :returns: identity matrix

.. js:function:: identity(d)

  :param number d: dimension
  :returns: identity matrix of dimension ``d``

.. js:function:: extract(m, rowOffset, columnOffset, rows, columns[, result])

  .. note:: Not yet implemented

  :param Matrix m: matrix
  :param number rowOffset: starting row
  :param number columnOffset: starting column
  :param number rows: number of rows to extract
  :param number columns: number of columns to extract
  :param Matrix result: result
  :returns: sub-matrix of ``m``

Matrix2
-------

.. js:function:: toAngle(m)

  :param Matrix m: rotation matrix
  :returns: angle in radians

.. js:function:: fromAngle(angle[, result])

  :param number angle: angle in radians
  :param Matrix result: result
  :returns: 2-dimensional rotation matrix

Matrix3
-------

.. js:function:: toQuaternion(m[, result])

  .. note:: Not yet implemented

  :param Matrix m: rotation matrix
  :param Quaternion result: result
  :returns: quaternion rotation

.. js:function:: fromQuaternion(q[, result])

  .. note:: Not yet implemented

  :param Quaternion q: quaternion
  :param Matrix result: matrix
  :returns: rotation matrix

.. js:function:: toAxisAngle(m[, result])

  .. note:: Not yet implemented

  :param Matrix m: matrix
  :param Vector result: vector
  :returns: axis-angle vector

.. js:function:: fromAxisAngle(v[, result])

  .. note:: Not yet implemented

  :param Vector v: axis-angle vector
  :param Matrix result: result
  :returns: rotation matrix

Transform
---------

.. js:function:: translate(left, right[, result])

  .. note:: One of the operands must be a Transform

  :param left: left operand
  :param right: right operand
  :param Transform result: result
  :returns: transform with translation applied

  The translation should be expressed as a 3-dimensional vector.

.. js:function:: rotate(left, right[, result])

  .. note:: One of the operands must be a Transform

  :param left: left operand
  :param right: right operand
  :param Transform result: result
  :returns: transform with rotation applied

  The rotation should be expressed as an angle or rotation matrix for 2 dimensions, or rotation matrix, axis-angle or quaternion for 3 dimensions.

.. js:function:: scale(left, right[, result])

  .. note:: One of the operands must be a Transform

  :param left: left operand
  :param right: right operand
  :param Transform result: result
  :returns: transform with scaling applied

  The scaling should be expressed as a vector, with each component specifying the factor in the corresponding dimension.

.. js:function:: linear(t[, result])

  :param Transform t: transform
  :param Matrix result: result
  :returns: linear part (rotation and scaling) of the affine transform

.. js:function:: svd(t, translation, rotation, scaling)

  :param Transform t: transform
  :param Vector translation: result vector to store translation
  :param Quaternion rotation: result quaternion to store rotation
  :param Vector scaling: result vector to store scaling