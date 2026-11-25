const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const protect = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// reject bad ids early so mongoose doesn't throw a CastError
const checkId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid project id' });
  }
  next();
};

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, repoUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    const project = await Project.create({ user: req.user._id, name, repoUrl });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', checkId, async (req, res, next) => {
  try {
    const { name, repoUrl, status } = req.body;
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (name !== undefined) project.name = name;
    if (repoUrl !== undefined) project.repoUrl = repoUrl;
    if (status !== undefined) project.status = status;

    await project.save();
    res.json(project);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
});

router.delete('/:id', checkId, async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
