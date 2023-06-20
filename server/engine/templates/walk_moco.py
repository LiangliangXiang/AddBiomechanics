import opensim as osim

# Construct the MocoInverse tool.
inverse = osim.MocoInverse()

# Replace locked coordinates with weld joints.
model = osim.Model('../Models/final.osim')
model.initSystem()
coordinates = model.getCoordinateSet()
locked_joints = list()
locked_coordinates = list()
for icoord in range(coordinates.getSize()):
    coord = coordinates.get(icoord)
    if coord.get_locked():
        locked_coordinates.append(coord.getName())
        locked_joints.append(coord.getJoint().getName())

# Move actuators associated with removed coordinates.
for coordinate in locked_coordinates:
    forceSet = model.getForceSet()
    for iforce in range(forceSet.getSize()):
        force = forceSet.get(iforce)
        if force.getConcreteClassName().endswith('CoordinateActuator'):
            actu = osim.CoordinateActuator.safeDownCast(force)
            if actu.get_coordinate() == coordinate:
                forceSet.remove(iforce)
                break

# Construct a ModelProcessor and set it on the tool. The default
# muscles in the model are replaced with optimization-friendly
# DeGrooteFregly2016Muscles, and adjustments are made to the default muscle
# parameters.
modelProcessor = osim.ModelProcessor(model)
modelProcessor.append(osim.ModOpAddExternalLoads('../ID/walk_external_forces.xml'))
modelProcessor.append(osim.ModOpIgnoreTendonCompliance())
modelProcessor.append(osim.ModOpReplaceMusclesWithDeGrooteFregly2016())
modelProcessor.append(osim.ModOpIgnorePassiveFiberForcesDGF())
modelProcessor.append(osim.ModOpReplaceJointsWithWelds(locked_joints))
inverse.setModel(modelProcessor)

# Construct a TableProcessor of the coordinate data and pass it to the
# inverse tool. TableProcessors can be used in the same way as
# ModelProcessors by appending TableOperators to modify the base table.
# A TableProcessor with no operators, as we have here, simply returns the
# base table.
inverse.setKinematics(osim.TableProcessor('../IK/walk_ik.mot'))

# Initial time, final time, and mesh interval.
inverse.set_initial_time(0.25)
inverse.set_final_time(2.2)
inverse.set_mesh_interval(0.02)

# By default, Moco gives an error if the kinematics contains extra columns.
# Here, we tell Moco to allow (and ignore) those extra columns.
inverse.set_kinematics_allow_extra_columns(True)

# Solve the problem and write the solution to a Storage file.
solution = inverse.solve()
solution.getMocoSolution().write('walk_MocoInverse_solution.sto')

# Generate a PDF with plots for the solution trajectory.
model = modelProcessor.process()
report = osim.report.Report(model,
                            'walk_MocoInverse_solution.sto',
                            bilateral=True)
# The PDF is saved to the working directory.
report.generate()
