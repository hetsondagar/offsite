/**
 * DPR Summary AI Service
 * Aggregates real DPR data and generates AI summaries
 */

import { DPR } from '../../modules/dpr/dpr.model';
import { Task } from '../../modules/tasks/task.model';
import { MaterialRequest } from '../../modules/materials/material.model';
import { Project } from '../../modules/projects/project.model';
import { huggingFaceService } from './huggingface.service';
import { logger } from '../../utils/logger';

interface DPRSummaryData {
  projectName: string;
  date: string;
  taskList: string[];
  completionPercent: number;
  laborCount: number;
  materialSummary: string;
  issues: string;
}

interface DPRSummaryResponse {
  summary: string;
  risks?: string;
  generatedAt: string;
  dataSource: 'mongodb';
}

/**
 * Fetch and aggregate DPR data for AI summary
 */
export async function aggregateDPRData(
  projectId: string,
  dprId: string
): Promise<DPRSummaryData | null> {
  try {
    // Fetch DPR
    const dpr = await DPR.findById(dprId)
      .populate('projectId', 'name')
      .populate('createdBy', 'name');

    if (!dpr || dpr.projectId?.toString() !== projectId) {
      return null;
    }

    const project = dpr.projectId as any;
    const projectName = project?.name || 'Unknown Project';

    // Fetch tasks worked on
    const taskIds = dpr.tasksWorkedOn || [];
    const tasks = await Task.find({ _id: { $in: taskIds } })
      .select('title')
      .limit(10); // Limit to prevent prompt bloat
    const taskList = tasks.map(t => t.title);

    // Calculate work completion
    const completionPercent = dpr.workCompletedPercent || 0;

    // Get labor count from attendance or DPR
    const laborCount = dpr.laborCount || 0;

    // Aggregate material usage from material requests for this date
    const dprDate = new Date(dpr.date);
    const startOfDay = new Date(dprDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dprDate.setHours(23, 59, 59, 999));

    const materialRequests = await MaterialRequest.find({
      projectId: projectId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved',
    })
      .select('materialName quantity unit')
      .limit(10);

    const materialSummary = materialRequests.length > 0
      ? materialRequests.map(m => `${m.materialName}: ${m.quantity} ${m.unit}`).join(', ')
      : 'No materials recorded';

    // Get issues from DPR
    const issues = dpr.issues || dpr.notes || 'None';

    return {
      projectName,
      date: dpr.date.toISOString().split('T')[0],
      taskList,
      completionPercent,
      laborCount,
      materialSummary,
      issues: typeof issues === 'string' ? issues : 'None',
    };
  } catch (error) {
    logger.error('Error aggregating DPR data:', error);
    return null;
  }
}

/**
 * Generate AI summary for DPR
 */
export async function generateDPRSummary(
  projectId: string,
  dprId: string
): Promise<DPRSummaryResponse | null> {
  try {
    // Aggregate real data from MongoDB
    const data = await aggregateDPRData(projectId, dprId);

    if (!data) {
      return null;
    }

    // If AI service is not available, return structured data
    if (!huggingFaceService.isAvailable()) {
      return {
        summary: `Daily Progress Report for ${data.projectName} on ${data.date}. Work completed: ${data.completionPercent}%. ${data.laborCount} laborers. Tasks: ${data.taskList.join(', ')}. Materials: ${data.materialSummary}.`,
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Build prompt with real data only
    const prompt = `You are an AI assistant for a construction management system in India.

Summarize the following daily progress report data clearly and professionally.
Use only the data provided.
Do not assume missing information.

DPR Data:
- Project: ${data.projectName}
- Date: ${data.date}
- Tasks worked on: ${data.taskList.length > 0 ? data.taskList.join(', ') : 'None recorded'}
- Work completed today (%): ${data.completionPercent}%
- Labor count: ${data.laborCount}
- Materials used: ${data.materialSummary}
- Issues reported: ${data.issues}

Generate:
1. A concise professional summary (5–6 lines)
2. A short risks/concerns section if applicable

Format your response as:
SUMMARY: [your summary here]
RISKS: [risks or concerns, or "None" if no issues]`;

    const aiResponse = await huggingFaceService.generateText(prompt, 300);

    if (!aiResponse) {
      // Fallback to structured summary
      return {
        summary: `Daily Progress Report for ${data.projectName} on ${data.date}. Work completed: ${data.completionPercent}%. ${data.laborCount} laborers. Tasks: ${data.taskList.join(', ')}. Materials: ${data.materialSummary}.`,
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Parse AI response
    const summaryMatch = aiResponse.match(/SUMMARY:\s*(.+?)(?=RISKS:|$)/is);
    const risksMatch = aiResponse.match(/RISKS:\s*(.+?)$/is);

    return {
      summary: summaryMatch ? summaryMatch[1].trim() : aiResponse.split('\n')[0] || 'Summary generated from site data.',
      risks: risksMatch && risksMatch[1].trim() !== 'None' ? risksMatch[1].trim() : undefined,
      generatedAt: new Date().toISOString(),
      dataSource: 'mongodb',
    };
  } catch (error) {
    logger.error('Error generating DPR summary:', error);
    return null;
  }
}

