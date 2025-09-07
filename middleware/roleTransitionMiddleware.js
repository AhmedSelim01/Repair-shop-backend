const asyncHandler = require('express-async-handler');
const User = require('../models/User'); // Added import
const Company = require('../models/Company'); // Added import
const Driver = require('../models/Driver'); // Added import
const Truck = require('../models/Truck'); // Added import

exports.handleRoleTransition = asyncHandler(async (req, res, next) => {
    const { role, companyName, licensePlate, companyId, driverInfo, companyDetails, brand } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        let newCompany; // Declare in parent scope for response access

        switch (role) {
            case 'company': {
                if (user.companyId) {
                    return res.status(400).json({ success: false, message: 'Already linked to a company.' });
                }

                // Create company and update user role
                newCompany = await Company.create({
                    companyName: companyName || `Company-${user.email}`,
                    contactEmail: user.email,
                });
                user.role = 'company';
                user.companyId = newCompany._id;
                break;
            }

            case 'company_driver': {
                if (!companyId || !driverInfo) {
                    return res.status(400).json({ success: false, message: 'Company ID and driver information required.' });
                }

                const company = await Company.findById(companyId);
                if (!company) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Company not found. Would you like to continue as an unregistered driver?',
                        canRegisterAsUnregistered: true
                    });
                }

                // Create driver record
                await Driver.create({
                    driverName: driverInfo.name,
                    driverPhone: driverInfo.phoneNumber,
                    driverIdNumber: driverInfo.idNumber,
                    licensePlate: driverInfo.licensePlate,
                    userId: user._id,
                    associatedCompany: companyId,
                    isRegisteredCompanyDriver: true
                });

                user.role = 'company_driver';
                user.driverInfo = driverInfo;
                break;
            }

            case 'unregistered_driver': {
                if (!driverInfo || !companyDetails) {
                    return res.status(400).json({ success: false, message: 'Driver and company information required.' });
                }

                // Create driver record for unregistered company
                await Driver.create({
                    driverName: driverInfo.name,
                    driverPhone: driverInfo.phoneNumber,
                    driverIdNumber: driverInfo.idNumber,
                    licensePlate: driverInfo.licensePlate,
                    userId: user._id,
                    externalCompanyDetails: companyDetails,
                    isRegisteredCompanyDriver: false
                });

                user.role = 'unregistered_driver';
                user.driverInfo = driverInfo;
                user.companyDetails = companyDetails;
                break;
            }

            case 'truck_owner': {
                if (!licensePlate || !brand) {
                    return res.status(400).json({ success: false, message: 'License plate and truck brand are required.' });
                }

                // Create truck record
                const truck = await Truck.create({
                    licensePlate,
                    brand,
                    owner: user._id,
                    status: 'pending'
                });

                user.role = 'truck_owner';
                user.licensePlate = licensePlate;
                user.associatedTrucks = [truck._id];
                break;
            }

            default:
                return res.status(400).json({ success: false, message: 'Invalid role specified.' });
        }

        await user.save();
        
        const response = {
            success: true,
            message: 'Role transition successful.',
            user,
        };

        if (role === 'company') {
            response.company = newCompany; // Now properly defined
            response.needsProfileCompletion = true;
            response.message += ' Please complete your company profile with additional details.';
        }

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});