const JobCard = require('../models/JobCard');

const updateMilestone = async (jobCardId, milestone) => {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) {
        throw new Error('Job card not found');
    }

    jobCard.repairMilestones.push(milestone);
    await jobCard.save();
};

module.exports = {
    updateMilestone,
};