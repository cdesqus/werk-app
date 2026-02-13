
// --- SYSTEM SETTINGS (Shifts, Holidays, Roster) ---

// 1. Shift Management
app.get('/api/admin/shifts', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const shifts = await Shift.findAll({ order: [['id', 'ASC']] });
        res.json(shifts);
    } catch (error) { next(error); }
});

app.post('/api/admin/shifts', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { name, startTime, endTime, lateTolerance, color } = req.body;
        const shift = await Shift.create({ name, startTime, endTime, lateTolerance, color });
        res.status(201).json(shift);
    } catch (error) { next(error); }
});

app.put('/api/admin/shifts/:id', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, startTime, endTime, lateTolerance, color } = req.body;
        const shift = await Shift.findByPk(id);
        if (!shift) return res.status(404).json({ error: 'Shift not found' });

        await shift.update({ name, startTime, endTime, lateTolerance, color });
        res.json(shift);
    } catch (error) { next(error); }
});

app.delete('/api/admin/shifts/:id', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Optional: Check if used in AttendanceLog or UserShift before delete?
        // For simplicity, allow delete but warn on frontend.
        await Shift.destroy({ where: { id } });
        res.json({ message: 'Shift deleted' });
    } catch (error) { next(error); }
});


// 2. Holiday Management
app.get('/api/holidays', async (req, res, next) => {
    try {
        const holidays = await Holiday.findAll({ order: [['date', 'ASC']] });
        res.json(holidays);
    } catch (error) { next(error); }
});

app.post('/api/admin/holidays', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { name, date, type, isRecurring } = req.body;
        const holiday = await Holiday.create({ name, date, type, isRecurring });
        res.status(201).json(holiday);
    } catch (error) { next(error); }
});

app.delete('/api/admin/holidays/:id', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        await Holiday.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Holiday deleted' });
    } catch (error) { next(error); }
});


// 3. User Shift Roster
app.get('/api/admin/roster', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        // Fetch rosters for a given month? Or all future?
        // Let's support date range query if needed, or just return all UserShifts for now.
        // Frontend sends ?month=X&year=Y, but let's just return all for simplicity or filter by year.
        const rosters = await UserShift.findAll({
            include: [
                { model: User, attributes: ['id', 'name'] },
                { model: Shift }
            ],
            order: [['startDate', 'ASC']]
        });
        res.json(rosters);
    } catch (error) { next(error); }
});

app.post('/api/admin/roster', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { userId, shiftId, startDate, endDate } = req.body;

        // Validation: Ensure endDate >= startDate
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End Date cannot be before Start Date' });
        }

        // Logic: Create UserShift entry
        // Overlap check? For now, let's just create it.
        const assignment = await UserShift.create({
            UserId: userId,
            ShiftId: shiftId,
            startDate,
            endDate
        });

        res.status(201).json(assignment);
    } catch (error) { next(error); }
});

// Update User Default Shift
app.put('/api/admin/users/:id/shift', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { shiftId } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // If shiftId is null or empty, set to null
        user.defaultShiftId = shiftId || null;
        await user.save();
        res.json({ message: 'Default shift updated' });
    } catch (error) { next(error); }
});
