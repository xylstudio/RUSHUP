'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useSupabase } from '@/app/supabase-provider'
import { getCustomers, getCustomerHouses, type Profile, type House } from '@/lib/supabaseClient'
import { getHousePlanByHouseId, saveHousePlan, type HousePlan } from '@/lib/housePlans'
import { useToastContext } from '@/components/Toast'
import {
    MousePointer2, Hand, Square, Minus, ZoomIn, ZoomOut, Trash2,
    Calculator, Download, User, Home, Map, ArrowLeft,
    Settings2, Info, CheckCircle2, Save,
    Maximize, PenTool, Layout, Circle, Triangle,
    Type, Palette, Layers, LineChart, Leaf, Flower2,
    RotateCw, RefreshCcw, Ruler, Magnet
} from 'lucide-react'

// --- Xylem NEXUS FUSION Engine V16.0 (Professional) ---
const PIXELS_PER_METER = 50
const SNAP_SIZE = 5
const GRID_1M = PIXELS_PER_METER
const MAGNETIC_RADIUS = 30; const MOVE_MAGNETIC_RADIUS = 15; const ALIGNMENT_THRESHOLD = 10; const EDGE_SNAP_THRESHOLD = 25;

interface Point { x: number; y: number }
interface Guide { type: 'v' | 'h'; pos: number }
const snapToGrid = (v: number) => Math.round(v / SNAP_SIZE) * SNAP_SIZE

function projectPointOnSegment(p: Point, a: Point, b: Point): Point {
    const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
    if (l2 === 0) return a
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
    t = Math.max(0, Math.min(1, t))
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

const simplifyCollinearPoints = (pts: Point[]) => {
    if (pts.length < 3) return pts;
    // Step 1: Remove micro-duplicates (precision: 0.1px)
    const clean = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.1);
    if (clean.length < 3) return clean;

    const result = [clean[0]];
    for (let i = 1; i < clean.length - 1; i++) {
        const a = result[result.length - 1];
        const b = clean[i];
        const c = clean[i + 1];

        // Step 2: High-precision collinearity check
        const area = Math.abs((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
        const segmentLen = Math.hypot(c.x - a.x, c.y - a.y);

        // Epsilon lowered to 0.1px to prevent 'Collapsed Lines' bug. 
        // Points are only removed if they are essentially on the same mathematical ray.
        if (area > 0.1 * segmentLen) {
            result.push(b);
        }
    }
    result.push(clean[clean.length - 1]);
    return result;
}

const calculatePolygonArea = (points: Point[], bulges: number[] = []) => {
    let area = 0
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        area += points[i].x * points[j].y
        area -= points[j].x * points[i].y
    }
    area = Math.abs(area) / 2

    for (let i = 0; i < points.length; i++) {
        const b = bulges[i] || 0
        if (b !== 0) {
            const p1 = points[i]; const p2 = points[(i + 1) % points.length]
            const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y)
            const segmentArea = (chord * chord / 4) * (Math.abs(b) + Math.pow(b, 3) / 3)
            area += segmentArea
        }
    }
    return area
}

const getCurvePath = (points: Point[], bulges: number[] = []) => {
    if (points.length < 2) return ""
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % points.length]
        const b = bulges[i] || 0
        if (b === 0) {
            d += ` L ${p2.x} ${p2.y}`
        } else {
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
            const sagitta = dist * b / 2
            const radius = Math.abs((sagitta / 2) + (dist * dist / (8 * sagitta)))
            const largeArc = Math.abs(b) > 1 ? 1 : 0
            const sweep = b > 0 ? 1 : 0
            d += ` A ${radius} ${radius} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y}`
        }
    }
    return d + " Z"
}

const normalizeWinding = (pts: Point[]): Point[] => {
    if (pts.length < 3) return pts;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return area < 0 ? [...pts].reverse() : pts; // Force Clockwise
}

const getEdgeAngle = (p1: Point, p2: Point) => Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI

const rotatePoints = (pts: Point[], center: Point, angle: number): Point[] => {
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad); const sin = Math.sin(rad)
    return pts.map(p => ({
        x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
        y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos
    }))
}

const rotatePoint = (p: Point, center: Point, angle: number): Point => {
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad); const sin = Math.sin(rad)
    const dx = p.x - center.x; const dy = p.y - center.y
    return { x: center.x + (dx * cos - dy * sin), y: center.y + (dx * sin + dy * cos) }
}

const getElementVertices = (el: any): Point[] => {
    let pts: Point[] = []
    if (el.points && el.points.length > 0) pts = el.points;
    else if (el.shape === 'rectangle' || el.w !== undefined) {
        const w = el.w || 0; const h = el.h || 0;
        pts = [{ x: el.x, y: el.y }, { x: el.x + w, y: el.y }, { x: el.x + w, y: el.y + h }, { x: el.x, y: el.y + h }]
    } else if (el.x2 !== undefined) {
        pts = [{ x: el.x, y: el.y }, { x: el.x2, y: el.y2 }]
    } else {
        pts = [{ x: el.x, y: el.y }]
    }
    if (el.rotation && el.rotation !== 0) {
        const center = el.points ? el.points[0] : { x: el.x + (el.w || 0) / 2, y: el.y + (el.h || 0) / 2 }
        pts = pts.map(p => rotatePoint(p, center, el.rotation))
    }
    return normalizeWinding(pts)
}

export default function XylemMasterplanStudio() {
    const { profile, loading: authLoading } = useAuth()
    const { success: showSuccess, error: showError } = useToastContext()

    // App States
    const [view, setView] = useState<'selection' | 'workspace'>('selection')
    const [customers, setCustomers] = useState<Profile[]>([])
    const [houses, setHouses] = useState<House[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
    const [selectedHouseId, setSelectedHouseId] = useState<string>('')

    // Canvas States
    const [elements, setElements] = useState<any[]>([])
    const [layers, setLayers] = useState<any[]>([{ id: 'default', name: 'Layout 1', visible: true, locked: false }])
    const [activeLayerId, setActiveLayerId] = useState<string>('default')
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // History State
    const [history, setHistory] = useState<any[][]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    const addToHistory = (currentElements: any[]) => {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(JSON.parse(JSON.stringify(currentElements)))
        if (newHistory.length > 50) newHistory.shift()
        setHistory(newHistory); setHistoryIndex(newHistory.length - 1)
    }

    const undo = () => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1]
            setElements(JSON.parse(JSON.stringify(prev)))
            setHistoryIndex(historyIndex - 1)
        }
    }

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1]
            setElements(JSON.parse(JSON.stringify(next)))
            setHistoryIndex(historyIndex + 1)
        }
    }
    const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null)
    const [tool, setTool] = useState<'select' | 'pan' | 'wall' | 'space' | 'plant' | 'polygon' | 'triangle'>('select')
    const [unit, setUnit] = useState<'m' | 'cm'>('m')
    const [activeShape, setActiveShape] = useState<'rectangle' | 'circle' | 'triangle' | 'polygon'>('rectangle')

    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isPanning, setIsPanning] = useState(false)
    const [isMoving, setIsMoving] = useState(false)
    const [isCurving, setIsCurving] = useState(false)
    const [isAltPressed, setIsAltPressed] = useState(false) // Tracking Alt key for cursor/pan
    const [curvingEdgeIndex, setCurvingEdgeIndex] = useState<number | null>(null)
    const [curvingElementId, setCurvingElementId] = useState<string | null>(null)
    const [snapEnabled, setSnapEnabled] = useState(true)
    const [showLabels, setShowLabels] = useState(true)
    const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 })
    const [mouseGrabOffset, setMouseGrabOffset] = useState<Point | null>(null)
    const [currentElement, setCurrentElement] = useState<any>(null)
    const [polyPoints, setPolyPoints] = useState<Point[]>([])
    const [loading, setLoading] = useState(false)
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
    const [snapPoint, setSnapPoint] = useState<Point | null>(null)
    const [activeGuides, setActiveGuides] = useState<Guide[]>([])
    const [fusionTargetId, setFusionTargetId] = useState<string | null>(null)
    const [previewFusionPoints, setPreviewFusionPoints] = useState<Point[] | null>(null)
    const [ghostSnapElement, setGhostSnapElement] = useState<any | null>(null)
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectionBox, setSelectionBox] = useState<{ start: Point, end: Point } | null>(null)

    const svgRef = useRef<SVGSVGElement>(null)

    // Metrics
    const totalArea = useMemo(() =>
        elements.filter(el => ['space', 'triangle', 'polygon'].includes(el.type)).reduce((sum, el) => {
            if (el.points) return sum + (calculatePolygonArea(el.points) / (PIXELS_PER_METER ** 2))
            if (el.shape === 'circle') {
                const r = Math.hypot(el.w, el.h) / 2; return sum + ((Math.PI * r * r) / (PIXELS_PER_METER ** 2))
            }
            return sum + ((Math.abs(el.w) / PIXELS_PER_METER) * (Math.abs(el.h) / PIXELS_PER_METER))
        }, 0)
        , [elements])

    const selectedElement = useMemo(() => elements.find(el => el.id === (selectedIds[0])), [elements, selectedIds])
    const selectedHouse = useMemo(() => houses.find(h => h.id === selectedHouseId), [houses, selectedHouseId])

    const fmtD = (px: number) => (unit === 'm' ? `${(px / PIXELS_PER_METER).toFixed(2)} m` : `${Math.round(px / PIXELS_PER_METER * 100)} cm`)
    const fmtA = (sqpx: number) => (unit === 'm' ? `${(sqpx / (PIXELS_PER_METER ** 2)).toFixed(2)} m²` : `${(sqpx / (PIXELS_PER_METER ** 2) * 10000).toLocaleString()} cm²`)


    // --- ENGINE V15.2 PRECISION ---
    const getMagneticPoint = (target: Point, ignoreId: string | null = null): { snapped: Point, activeGuides: Guide[] } => {
        if (!snapEnabled) return { snapped: target, activeGuides: [] }
        let result = { ...target }
        let guides: Guide[] = []
        let closestPoint: Point | null = null
        const threshold = isMoving ? MOVE_MAGNETIC_RADIUS : MAGNETIC_RADIUS
        let minDist = threshold / zoom

        // 0. Edge-to-Edge Alignment (Global Object Snapping)
        if (isMoving && ignoreId) {
            const movedEl = elements.find(el => el.id === ignoreId)
            if (movedEl) {
                const mPts = movedEl.points || (movedEl.w ? [{ x: movedEl.x, y: movedEl.y }, { x: movedEl.x + movedEl.w, y: movedEl.y }, { x: movedEl.x + movedEl.w, y: movedEl.y + movedEl.h }, { x: movedEl.x, y: movedEl.y + movedEl.h }] : [{ x: movedEl.x, y: movedEl.y }, { x: (movedEl.x2 || 0), y: (movedEl.y2 || 0) }])

                for (const el of elements) {
                    if (el.id === ignoreId) continue
                    const tPts = el.points || (el.w ? [{ x: el.x, y: el.y }, { x: el.x + el.w, y: el.y }, { x: el.x + el.w, y: el.y + el.h }, { x: el.x, y: el.y + el.h }] : [{ x: el.x, y: el.y }, { x: (el.x2 || 0), y: (el.y2 || 0) }])

                    for (const mp of mPts as Point[]) {
                        for (const tp of tPts as Point[]) {
                            const dx = Math.abs(mp.x - tp.x); const dy = Math.abs(mp.y - tp.y)
                            if (dx < minDist) { result.x += (tp.x - mp.x); guides.push({ type: 'v', pos: tp.x }); return { snapped: result, activeGuides: guides } }
                            if (dy < minDist) { result.y += (tp.y - mp.y); guides.push({ type: 'h', pos: tp.y }); return { snapped: result, activeGuides: guides } }
                        }
                    }
                }
            }
        }

        // 1. Vertex Snapping
        elements.forEach(el => {
            if (el.id === ignoreId) return
            const pts = getElementVertices(el)
            pts.forEach(p => {
                const d = Math.hypot(target.x - p.x, target.y - p.y)
                if (d < minDist) { minDist = d; closestPoint = p; }
            })
        })

        if (closestPoint) { setSnapPoint(closestPoint); return { snapped: closestPoint, activeGuides: [] } }

        // 2. Edge Snapping
        let closestEdgePoint: Point | null = null
        let edgeDist = (EDGE_SNAP_THRESHOLD / zoom)
        elements.forEach(el => {
            if (el.id === ignoreId) return
            const edges: [Point, Point][] = []
            if (el.points) el.points.forEach((p: Point, i: number) => edges.push([p, el.points[(i + 1) % el.points.length]]))
            else if (el.shape === 'rectangle') {
                const p1 = { x: el.x, y: el.y }, p2 = { x: el.x + el.w, y: el.y }, p3 = { x: el.x + el.w, y: el.y + el.h }, p4 = { x: el.x, y: el.y + el.h }
                edges.push([p1, p2], [p2, p3], [p3, p4], [p4, p1])
            }
            edges.forEach(([a, b]) => {
                const p = projectPointOnSegment(target, a, b)
                const d = Math.hypot(target.x - p.x, target.y - p.y)
                if (d < edgeDist) { edgeDist = d; closestEdgePoint = p; }
            })
        })

        if (closestEdgePoint && !isMoving) { setSnapPoint(closestEdgePoint); return { snapped: closestEdgePoint, activeGuides: [] } }
        setSnapPoint(null)

        // 3. Alignment Guides
        let bestX = null; let bestY = null; let minDX = ALIGNMENT_THRESHOLD / zoom; let minDY = ALIGNMENT_THRESHOLD / zoom
        elements.forEach(el => {
            if (el.id === ignoreId) return
            const anchorPoints: Point[] = []
            if (el.points) anchorPoints.push(...el.points)
            else if (el.shape === 'rectangle') anchorPoints.push({ x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }, { x: el.x + el.w / 2, y: el.y + el.h / 2 })
            else anchorPoints.push({ x: el.x, y: el.y })

            anchorPoints.forEach(ap => {
                if (Math.abs(target.x - ap.x) < minDX) { minDX = Math.abs(target.x - ap.x); bestX = ap.x; }
                if (Math.abs(target.y - ap.y) < minDY) { minDY = Math.abs(target.y - ap.y); bestY = ap.y; }
            })
        })

        if (bestX !== null) { result.x = bestX; guides.push({ type: 'v', pos: bestX }); }
        if (bestY !== null) { result.y = bestY; guides.push({ type: 'h', pos: bestY }); }

        return { snapped: result, activeGuides: guides }
    }

    // Lifecycle
    useEffect(() => { getCustomers().then(({ data }) => setCustomers(data || [])) }, [])
    useEffect(() => { if (selectedCustomerId) getCustomerHouses(selectedCustomerId).then(({ data }) => setHouses(data || [])) }, [selectedCustomerId])

    useEffect(() => {
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'AltLeft' || e.code === 'AltRight' || e.key === 'Alt') setIsAltPressed(false) }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'AltLeft' || e.code === 'AltRight' || e.key === 'Alt') setIsAltPressed(true)
            if ((e.code === 'Backspace' || e.code === 'Delete' || e.key === 'Delete') && selectedIds.length > 0 && (e.target as HTMLElement).tagName !== 'INPUT') {
                const newEls = elements.filter(el => !selectedIds.includes(el.id))
                setElements(newEls); setSelectedIds([]); addToHistory(newEls)
            }
            if (e.code === 'Escape' || e.key === 'Escape') { setPolyPoints([]); setTool('select'); setSelectedIds([]); }
            if (e.ctrlKey || e.metaKey) {
                if (e.code === 'KeyZ') { e.preventDefault(); undo(); }
                if (e.code === 'KeyY') { e.preventDefault(); redo(); }
            }
            if (e.code === 'KeyM' && selectedIds.length > 0 && !isMoving && !isDrawing) {
                if (selectedIds.length === 1) {
                    // Current Neighbor-based Fusion
                    const movedEl = elements.find(it => it.id === selectedIds[0])
                    if (movedEl) {
                        const others = elements.filter(it => it.id !== selectedIds[0])
                        const mPts = getElementVertices(movedEl)
                        const fThreshold = 80 / zoom
                        let foundFId: string | null = null

                        others.forEach(o => {
                            const oPts = getElementVertices(o)
                            if (mPts.some((mp: Point) => oPts.some((op: Point) => Math.hypot(mp.x - op.x, mp.y - op.y) < fThreshold))) {
                                foundFId = o.id
                            }
                        })

                        if (foundFId) {
                            performFusion(selectedIds[0], foundFId)
                            showSuccess('Atomic Merge Complete')
                        }
                    }
                } else {
                    // V5.0 Batch Fusion Logic
                    performBatchFusion(selectedIds)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); }
    }, [selectedIds, elements, zoom, historyIndex, history])

    const calculatePotentialFusion = (sourceId: string, targetId: string, els: any[]): Point[] | null => {
        const source = els.find(it => it.id === sourceId)
        const target = els.find(it => it.id === targetId)
        if (!source || !target) return null

        let sPts = normalizeWinding(getElementVertices(source))
        let tPts = normalizeWinding(getElementVertices(target))
        const snapRadius = 25 / zoom

        const injectPoints = (ptsA: Point[], ptsB: Point[]) => {
            let newB = [...ptsB]
            for (const pa of ptsA) {
                for (let j = 0; j < newB.length; j++) {
                    const p1 = newB[j], p2 = newB[(j + 1) % newB.length]
                    const proj = projectPointOnSegment(pa, p1, p2)
                    const distToEdge = Math.hypot(pa.x - proj.x, pa.y - proj.y)
                    const isNearV = Math.hypot(pa.x - p1.x, pa.y - p1.y) < snapRadius || Math.hypot(pa.x - p2.x, pa.y - p2.y) < snapRadius
                    if (distToEdge < snapRadius && !isNearV) { newB.splice(j + 1, 0, proj); break }
                }
            }
            return newB
        }
        tPts = injectPoints(sPts, tPts); sPts = injectPoints(tPts, sPts)

        const pairs: { i: number, j: number }[] = []
        sPts.forEach((sp: Point, i: number) => tPts.forEach((tp: Point, j: number) => {
            if (Math.hypot(sp.x - tp.x, sp.y - tp.y) < snapRadius) pairs.push({ i, j })
        }))

        if (pairs.length < 2) return null // Edge-to-Edge fusion requirement

        pairs.sort((a, b) => a.i - b.i)
        const p1 = pairs[0]; const p2 = pairs[pairs.length - 1]
        const sPath = []; let curr = p2.i
        while (curr !== p1.i) { sPath.push(sPts[curr]); curr = (curr + 1) % sPts.length }
        sPath.push(sPts[p1.i])
        const tPath = []; curr = p1.j
        while (curr !== p2.j) { tPath.push(tPts[curr]); curr = (curr + 1) % tPts.length }
        tPath.push(tPts[p2.j])

        const combined = [...sPath, ...tPath]
        const finalPts = simplifyCollinearPoints(combined.filter((p, idx, self) =>
            idx === self.findIndex(tp => Math.hypot(p.x - tp.x, p.y - tp.y) < 0.1)
        ))

        let resultArea = 0;
        for (let i = 0; i < finalPts.length; i++) {
            const j = (i + 1) % finalPts.length;
            resultArea += finalPts[i].x * finalPts[j].y - finalPts[j].x * finalPts[i].y;
        }
        if (finalPts.length < 3 || Math.abs(resultArea / 2) < 0.05) return null
        return finalPts
    }

    const performBatchFusion = (ids: string[]) => {
        setElements(els => {
            let workingEls = [...els]
            let primaryId = ids[0]
            let remainingIds = ids.slice(1)
            let fusedCount = 0

            let fusedAny = true
            while (fusedAny && remainingIds.length > 0) {
                fusedAny = false
                for (let i = 0; i < remainingIds.length; i++) {
                    const targetId = remainingIds[i]
                    const resultPts = calculatePotentialFusion(primaryId, targetId, workingEls)
                    if (resultPts) {
                        workingEls = workingEls.filter(el => el.id !== targetId).map(el => {
                            if (el.id === primaryId) {
                                return { ...el, points: resultPts, shape: 'polygon', type: el.type, fill: 'rgba(74, 103, 65, 0.15)', name: `Fused ${el.name}` }
                            }
                            return el
                        })
                        remainingIds.splice(i, 1)
                        fusedCount++
                        fusedAny = true
                        break
                    }
                }
            }
            if (fusedCount > 0) {
                setSelectedIds([primaryId])
                setTimeout(() => showSuccess(`Batch Fusion: ${fusedCount + 1} objects unified`), 100)
                addToHistory(workingEls)
                return workingEls
            }
            return els
        })
    }

    const performFusion = (sourceId: string, targetId: string) => {
        setElements(els => {
            const finalPts = calculatePotentialFusion(sourceId, targetId, els)
            if (!finalPts) return els

            const result = els.filter(it => it.id !== sourceId).map(it => {
                if (it.id === targetId) {
                    const { w, h, x2, y2, ...rest } = it
                    return { ...rest, points: finalPts, shape: 'polygon', type: it.type, fill: 'rgba(74, 103, 65, 0.15)', name: `Fused ${it.name}` }
                }
                return it
            })
            setSelectedIds([targetId])
            addToHistory(result)
            setFusionTargetId(null)
            setPreviewFusionPoints(null)
            return result
        })
    }

    const handleHouseSelect = (houseId: string) => {
        setSelectedHouseId(houseId); setLoading(true)
        getHousePlanByHouseId(houseId).then(({ data }) => {
            if (data && data.plan_data.elements) {
                const els = data.plan_data.elements || []
                setElements(els)
                setHistory([JSON.parse(JSON.stringify(els))]); setHistoryIndex(0)
                setLayers(data.plan_data.layers || [{ id: 'default', name: 'Layout 1', visible: true, locked: false }])
                setActiveLayerId(data.plan_data.activeLayerId || 'default')
                setPan(data.plan_data.pan || { x: 0, y: 0 })
                setZoom(data.plan_data.zoom || 1)
                setUnit(data.plan_data.unit || 'm')
                setSelectedIds([])
            } else {
                setElements([])
                setHistory([[]]); setHistoryIndex(0)
                setLayers([{ id: 'default', name: 'Layout 1', visible: true, locked: false }])
                setActiveLayerId('default')
                setPan({ x: 0, y: 0 }); setZoom(1); setUnit('m'); setSelectedIds([]);
            }
            setView('workspace'); setLoading(false)
        })
    }

    const getMouseCoords = (e: React.MouseEvent, useMagnet: boolean = true) => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const rect = svgRef.current.getBoundingClientRect()
        const rawX = (e.clientX - rect.left - pan.x) / zoom; const rawY = (e.clientY - rect.top - pan.y) / zoom

        if (useMagnet && tool !== 'pan') {
            const { snapped, activeGuides: g } = getMagneticPoint({ x: rawX, y: rawY }, isMoving && selectedIds.length > 0 ? selectedIds[0] : null)
            setActiveGuides(g); if (g.length > 0 || snapPoint) return snapped
        }
        setActiveGuides([]); setSnapPoint(null)
        return (tool !== 'pan' && tool !== 'select') ? { x: snapToGrid(rawX), y: snapToGrid(rawY) } : { x: rawX, y: rawY }
    }

    const handlePointerDown = (e: React.MouseEvent) => {
        if (e.button === 1 || tool === 'pan' || (e.button === 0 && e.altKey)) {
            setIsPanning(true); setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y }); return
        }
        if (e.button !== 0) return
        const coords = getMouseCoords(e, true) // Force snapping for all drawing starts

        if (tool === 'select') {
            const targetId = (e.target as any).id
            const el = elements.find(it => it.id === targetId)

            const layer = layers.find(l => l.id === el?.layerId)
            if (el && (el.layerId !== activeLayerId || (layer && layer.locked))) return;

            if (!el || targetId === 'grid-rect' || e.target === svgRef.current) {
                // START MARQUEE SELECTION
                setSelectedIds([]); setMouseGrabOffset(null)
                setIsSelecting(true); setSelectionBox({ start: coords, end: coords })
            } else {
                // CLICKED AN ELEMENT
                if (!selectedIds.includes(el.id)) {
                    setSelectedIds([el.id]);
                }
                setIsMoving(true)
                const ox = el.x !== undefined ? coords.x - el.x : coords.x
                const oy = el.y !== undefined ? coords.y - el.y : coords.y
                setMouseGrabOffset({ x: ox, y: oy })
            }
        } else if (tool === 'polygon') {
            const newPoints = [...polyPoints, coords]
            if (polyPoints.length > 2 && Math.hypot(coords.x - polyPoints[0].x, coords.y - polyPoints[0].y) < 15 / zoom) {
                const id = Math.random().toString(36).substr(2, 9)
                const layerId = `layer-${Math.random().toString(36).substr(2, 5)}`
                const newLayer = { id: layerId, name: `Zone ${elements.length + 1}`, visible: true, locked: false }
                const newElement = {
                    id, type: 'space', shape: 'polygon', points: polyPoints,
                    x: 0, y: 0,
                    name: `Zone ${elements.length + 1}`,
                    layerId,
                    fill: 'rgba(74, 103, 65, 0.15)', stroke: '#2a4532', strokeWidth: 2,
                    inventory: [], bulges: []
                }
                setLayers([...layers, newLayer]); setActiveLayerId(layerId)
                setElements([...elements, newElement]); setPolyPoints([]); setSelectedIds([id]); setTool('select'); return;
            }
            setPolyPoints(newPoints)
        } else {
            setIsDrawing(true); setSelectedIds([])
            const count = elements.length + 1
            const isSpace = tool === 'space' || tool === 'triangle' || tool === 'plant'
            const s = tool === 'plant' ? 'circle' : (tool === 'space' ? activeShape : (tool === 'triangle' ? 'triangle' : 'line'))
            const n = tool === 'plant' ? `Plant ${count}` : (isSpace ? `${(tool === 'triangle' ? 'Triangle' : s).toUpperCase()} ${count}` : 'Boundary')

            const newElement = {
                id: Math.random().toString(36).substr(2, 9),
                type: tool,
                shape: s,
                name: n,
                layerId: activeLayerId,
                x: coords.x, y: coords.y, x2: coords.x, y2: coords.y, w: 0, h: 0,
                originX: coords.x, originY: coords.y, // V5.1: Anchor for normalized drawing
                inventory: [], bulges: [],
                fill: tool === 'plant' ? 'rgba(16, 185, 129, 0.2)' : (isSpace ? 'rgba(74, 103, 65, 0.15)' : 'transparent'),
                stroke: tool === 'plant' ? '#059669' : '#2a4532',
                strokeWidth: 2, lineStyle: 'solid', rotation: 0
            }
            setCurrentElement(newElement); setSelectedIds([])
        }
    }

    const handlePointerMove = (e: React.MouseEvent) => {
        const coords = getMouseCoords(e)
        setMousePos(coords)
        if (isPanning) { setPan({ x: e.clientX - startPanPos.x, y: e.clientY - startPanPos.y }); return; }

        if (isSelecting && selectionBox) {
            const newBox = { ...selectionBox, end: coords }
            setSelectionBox(newBox)

            // Calculate which elements are inside the marquee
            const x1 = Math.min(newBox.start.x, newBox.end.x)
            const y1 = Math.min(newBox.start.y, newBox.end.y)
            const x2 = Math.max(newBox.start.x, newBox.end.x)
            const y2 = Math.max(newBox.start.y, newBox.end.y)

            const newlySelected = elements.filter(el => {
                const verts = getElementVertices(el)
                return verts.some(p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2)
            }).map(el => el.id)
            setSelectedIds(newlySelected)
            return
        }

        if (isDrawing && currentElement) {
            if (currentElement.shape === 'triangle') {
                const dx = coords.x - currentElement.originX; const dy = coords.y - currentElement.originY
                let pts = Math.abs(dx) > Math.abs(dy) ? [{ x: currentElement.originX, y: currentElement.originY }, { x: currentElement.originX, y: coords.y }, { x: coords.x, y: (currentElement.originY + coords.y) / 2 }] : [{ x: currentElement.originX, y: currentElement.originY }, { x: coords.x, y: currentElement.originY }, { x: (currentElement.originX + coords.x) / 2, y: coords.y }]
                setCurrentElement({ ...currentElement, points: pts, x2: coords.x, y2: coords.y, w: dx, h: dy })
            } else if (currentElement.shape === 'circle') {
                // For circles, distance from origin is radius
                const dx = coords.x - currentElement.originX; const dy = coords.y - currentElement.originY
                setCurrentElement({ ...currentElement, x2: coords.x, y2: coords.y, w: dx, h: dy })
            } else {
                // V5.1: NORMALIZED RECTANGLE (Supports drawing in any direction)
                const nx = Math.min(currentElement.originX, coords.x)
                const ny = Math.min(currentElement.originY, coords.y)
                const nw = Math.abs(coords.x - currentElement.originX)
                const nh = Math.abs(coords.y - currentElement.originY)
                setCurrentElement({ ...currentElement, x: nx, y: ny, w: nw, h: nh, x2: coords.x, y2: coords.y })
            }
        }

        if (isMoving && selectedIds.length > 0 && mouseGrabOffset) {
            const rawCoords = getMouseCoords(e, false)
            setMousePos(rawCoords)

            setElements(els => {
                const primaryId = selectedIds[0]
                const primaryEl = els.find(it => it.id === primaryId)
                if (!primaryEl) return els

                const newX = rawCoords.x - mouseGrabOffset.x; const newY = rawCoords.y - mouseGrabOffset.y
                const dx = newX - (primaryEl.x || 0); const dy = newY - (primaryEl.y || 0)

                // MOVE ALL SELECTED ELEMENTS
                const updatedElements = els.map(el => {
                    if (selectedIds.includes(el.id)) {
                        let updated = { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy }
                        if (el.points) updated.points = el.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }))
                        else if (updated.x2 !== undefined) { updated.x2 += dx; updated.y2 += dy }
                        return updated
                    }
                    return el
                })

                // 2. BACKGROUND PRECISION SNAPPING (BASED ON PRIMARY)
                const others = updatedElements.filter(it => !selectedIds.includes(it.id) && (['space', 'wall', 'plant', 'boundary'].includes(it.type)))
                const movedPrimary = updatedElements.find(it => it.id === primaryId)
                let ghostEl = JSON.parse(JSON.stringify(movedPrimary))
                let foundFusionId: string | null = null
                let ghostPts: Point[] | null = null
                let magnetFound = false

                const snapThreshold = 25 / zoom

                others.forEach(o => {
                    const oPts = getElementVertices(o)
                    const gPts = getElementVertices(ghostEl)
                    let magnetShift = { x: 0, y: 0 };

                    oPts.forEach((p1, j) => {
                        const p2 = oPts[(j + 1) % oPts.length]
                        gPts.forEach(gp => {
                            const proj = projectPointOnSegment(gp, p1, p2)
                            const d = Math.hypot(gp.x - proj.x, gp.y - proj.y)
                            if (d < snapThreshold) { magnetShift = { x: proj.x - gp.x, y: proj.y - gp.y }; magnetFound = true }
                        })
                    })

                    if (magnetFound) {
                        ghostEl.x += magnetShift.x; ghostEl.y += magnetShift.y
                        if (ghostEl.points) ghostEl.points = ghostEl.points.map((p: any) => ({ x: p.x + magnetShift.x, y: p.y + magnetShift.y }))
                        setGhostSnapElement(ghostEl)

                        if (ghostEl.shape === 'polygon' && o.shape === 'polygon' && ghostEl.type === o.type) {
                            const fPts = calculatePotentialFusion(primaryId, o.id, updatedElements.map(it => it.id === primaryId ? ghostEl : it))
                            if (fPts) { foundFusionId = o.id; ghostPts = fPts }
                        }
                    }
                })

                if (!magnetFound) setGhostSnapElement(null)
                setFusionTargetId(foundFusionId); setPreviewFusionPoints(ghostPts)

                return updatedElements
            })
        }

        if (isCurving && curvingElementId && curvingEdgeIndex !== null) {
            setElements(els => els.map(el => {
                if (el.id === curvingElementId && el.points) {
                    const p1 = el.points[curvingEdgeIndex!]
                    const p2 = el.points[(curvingEdgeIndex! + 1) % el.points.length]
                    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
                    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1
                    const perpX = -(p2.y - p1.y) / dist, perpY = (p2.x - p1.x) / dist
                    const sagitta = (coords.x - mid.x) * perpX + (coords.y - mid.y) * perpY
                    const bulge = (2 * sagitta) / (dist || 1)
                    const newB = el.bulges ? [...el.bulges] : []
                    while (newB.length < el.points.length) newB.push(0)
                    newB[curvingEdgeIndex!] = bulge
                    return { ...el, bulges: newB }
                }
                return el
            }))
        }
    }

    const handlePointerUp = () => {
        if (isPanning) setIsPanning(false)
        if (isSelecting) {
            setIsSelecting(false); setSelectionBox(null); return;
        }
        if (isDrawing && currentElement) {
            // 15.9 FUSION LOOP Engine (Drawing Phase)
            const type = currentElement.type
            let fused = false

            setElements(els => {
                const match = els.find(el => el.type === type && (
                    (el.x2 && Math.hypot(el.x2 - currentElement.x, el.y2 - currentElement.y) < 2 / zoom) ||
                    (el.points && el.points.some((p: Point) => Math.hypot(p.x - currentElement.x, p.y - currentElement.y) < 2 / zoom))
                ))

                if (match) {
                    fused = true
                    return els.map(el => {
                        if (el.id === match.id) {
                            if (type === 'wall' || type === 'boundary') {
                                const pts = el.points || [{ x: el.x, y: el.y }, { x: el.x2, y: el.y2 }]
                                // 15.13 Atomic Merge: Check collinearity immediately upon release
                                let updatedRawPts = [...pts, { x: currentElement.x2, y: currentElement.y2 }]
                                let updatedPts = simplifyCollinearPoints(updatedRawPts)

                                const d = Math.hypot(updatedPts[0].x - updatedPts[updatedPts.length - 1].x, updatedPts[0].y - updatedPts[updatedPts.length - 1].y)
                                if ((d < 20 / zoom) && updatedPts.length > 2) {
                                    return { ...el, type: 'space', shape: 'polygon', points: updatedPts, x2: updatedPts[0].x, y2: updatedPts[0].y, fill: 'rgba(59, 130, 246, 0.15)', name: `Zone ${els.length}` }
                                }
                                return { ...el, points: updatedPts, x2: updatedPts[updatedPts.length - 1].x, y2: updatedPts[updatedPts.length - 1].y }
                            }
                            if (type === 'space' && el.shape === 'polygon' && currentElement.shape === 'polygon') {
                                const newPts = [...el.points, ...currentElement.points.filter((p: Point) => !el.points.some((ep: Point) => Math.hypot(p.x - ep.x, p.y - ep.y) < 1))]
                                return { ...el, points: newPts }
                            }
                        }
                        return el
                    })
                }
                return els
            })

            if (!fused) {
                let el = { ...currentElement }
                // Auto-Close check for individual new drawing
                if ((el.type === 'wall' || el.type === 'boundary') && Math.hypot(el.x - el.x2, el.y - el.y2) < 15 / zoom) {
                    el = { ...el, type: 'space', shape: 'polygon', points: [{ x: el.x, y: el.y }, { x: el.x2, y: el.y2 }, { x: el.x, y: el.y }], fill: 'rgba(59, 130, 246, 0.15)' }
                }

                const newLayerId = `layer-${Math.random().toString(36).substr(2, 5)}`
                const newLayer = { id: newLayerId, name: el.name, visible: true, locked: false }
                const elementWithLayer = { ...el, layerId: newLayerId }

                const nextLayers = [...layers, newLayer]
                const nextEls = [...elements, elementWithLayer]

                setLayers(nextLayers)
                setElements(nextEls);
                setSelectedIds([elementWithLayer.id]);
                // Keep tool active for continuous drawing if it's a path
                if (el.type !== 'wall' && el.type !== 'boundary' && el.type !== 'space') {
                    setTool('select')
                }
                addToHistory(nextEls)
            } else {
                // Keep tool active
                addToHistory(elements)
            }

            setIsDrawing(false); setCurrentElement(null); setActiveGuides([])
        }

        if (isMoving && selectedIds.length > 0) {
            if (ghostSnapElement) {
                // Apply ghost snap to ALL elements in group based on primary
                setElements(els => {
                    const primaryId = selectedIds[0]
                    const primaryMoved = els.find(it => it.id === primaryId)
                    const dx = ghostSnapElement.x - (primaryMoved?.x || 0)
                    const dy = ghostSnapElement.y - (primaryMoved?.y || 0)

                    return els.map(el => {
                        if (selectedIds.includes(el.id)) {
                            let updated = { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy }
                            if (el.points) updated.points = el.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }))
                            else if (updated.x2 !== undefined) { updated.x2 += dx; updated.y2 += dy }
                            return updated
                        }
                        return el
                    })
                })
            }
            // V3.1: Disabled 'Auto-Fuse on Release'. 
            // Users must now explicitly press [M] while the Ghost Preview is visible.
            addToHistory(elements)
            setIsMoving(false); setMouseGrabOffset(null); setActiveGuides([]); setFusionTargetId(null); setGhostSnapElement(null); setPreviewFusionPoints(null)
        }
        if (isCurving) {
            setIsCurving(false); setCurvingEdgeIndex(null); setCurvingElementId(null)
            addToHistory(elements)
        }
    }

    const handleWheel = (e: React.WheelEvent) => {
        if (tool === 'select' || tool === 'pan' || e.ctrlKey || e.metaKey) {
            const delta = -e.deltaY
            const zoomFactor = 1.1
            const nextZoom = delta > 0 ? zoom * zoomFactor : zoom / zoomFactor
            const limitedZoom = Math.max(0.1, Math.min(nextZoom, 10))

            if (limitedZoom === zoom) return

            const rect = svgRef.current?.getBoundingClientRect()
            if (!rect) return

            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            const newPanX = mouseX - (mouseX - pan.x) * (limitedZoom / zoom)
            const newPanY = mouseY - (mouseY - pan.y) * (limitedZoom / zoom)

            setZoom(limitedZoom)
            setPan({ x: newPanX, y: newPanY })
            e.preventDefault()
        }
    }

    const handleSave = async () => {
        if (!selectedHouseId) return; setLoading(true)
        await saveHousePlan({ house_id: selectedHouseId, customer_id: selectedCustomerId, plan_name: 'Precision V15.2', plan_data: { elements, pan, zoom, unit } })
        showSuccess('Blueprint Synced 15.2'); setLoading(false)
    }

    // --- RENDER ---
    if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-white font-['Plus_Jakarta_Sans'] font-bold text-slate-900 animate-pulse">AUTHORIZING VAULT V15.2...</div>
    if (!profile || profile.role !== 'admin') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-20 text-center">
                <h1 className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-slate-900 mb-4 tracking-tighter">RESTRICTED AREA</h1>
                <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">You need Administrator Clearance to access the Masterplan Studio.</p>
                <button onClick={() => window.location.href = '/dashboard/customer'} className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all">Return to Sanctuary</button>
            </div>
        )
    }

    if (view === 'selection') {
        return (
            <div className="min-h-screen bg-slate-50 p-12 overflow-y-auto font-['Inter']">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-12 flex justify-between items-end border-b border-slate-200 pb-10">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase text-blue-600 tracking-[0.2em] mb-2 font-['Plus_Jakarta_Sans']">Precision CAD V15.2</h3>
                            <h1 className="text-5xl font-['Plus_Jakarta_Sans'] font-bold text-slate-900 tracking-tight">Studio</h1>
                        </div>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {customers.map(c => (
                            <div key={c.id} className="bg-white border border-slate-200 rounded-xl flex flex-col hover:shadow-xl transition-all overflow-hidden group">
                                <div className="p-8 border-b border-slate-100">
                                    <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-slate-900 truncate mb-1">{c.display_name || 'Client'}</h4>
                                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">{c.email}</p>
                                </div>
                                <div className="p-4 bg-slate-50 flex-1">
                                    <PortfolioList customerId={c.id} onSelect={(id) => { setSelectedCustomerId(c.id); handleHouseSelect(id); }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    } return (
        <div className="flex flex-col h-screen w-full bg-white font-['Inter'] overflow-hidden selection:bg-blue-100">
            <style dangerouslySetInnerHTML={{
                __html: `
        .crosshair {
            cursor: crosshair;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
        }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .headline { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />

            {/* TopNavBar */}
            <header className="bg-white border-b border-slate-200 fixed top-0 w-full z-50 flex justify-between items-center px-6 h-14">
                <div className="flex items-center gap-8">
                    <span className="text-lg font-bold tracking-tighter text-slate-900 headline">Archi_Minimal</span>
                    <nav className="flex gap-6">
                        <button className="font-['Plus_Jakarta_Sans'] text-sm tracking-tight text-blue-700 border-b-2 border-blue-700 pb-1">Draft</button>
                        <button className="font-['Plus_Jakarta_Sans'] text-sm tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Edit</button>
                        <button className="font-['Plus_Jakarta_Sans'] text-sm tracking-tight text-slate-500 hover:text-blue-600 transition-colors">View</button>
                        <button
                            onClick={() => setView('selection')}
                            className="font-['Plus_Jakarta_Sans'] text-sm tracking-tight text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Exit
                        </button>
                    </nav>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 font-['Inter']">
                    {selectedHouse?.name || 'Urban Garden Project'} — Masterplan Studio
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        title="Save Blueprint"
                        className={`p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-50 rounded-md transition-all ${loading ? 'animate-pulse' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">save</span>
                    </button>
                    <button className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-50 rounded-md transition-all"><span className="material-symbols-outlined text-[20px]">share</span></button>
                    <button className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-50 rounded-md transition-all"><span className="material-symbols-outlined text-[20px]">export_notes</span></button>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-md"><span className="material-symbols-outlined text-[20px]">undo</span></button>
                    <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-md"><span className="material-symbols-outlined text-[20px]">redo</span></button>
                </div>
            </header>

            <div className="flex flex-1 pt-14 pb-12 overflow-hidden">
                {/* Left SideNavBar */}
                <aside className="fixed left-0 top-14 h-[calc(100vh-104px)] w-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 gap-6 z-40">
                    <div className="flex flex-col gap-2 w-full px-2">
                        <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1 px-1">Navigation</div>
                        <button
                            onClick={() => { setTool('select'); setPolyPoints([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${tool === 'select' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{isAltPressed ? 'back_hand' : 'near_me'}</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">{isAltPressed ? 'Pan' : 'Select'}</span>
                        </button>

                        <div className="h-px bg-slate-200 my-2 mx-2"></div>
                        <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1 px-1">Shapes</div>

                        <button
                            onClick={() => { setTool('wall'); setSelectedIds([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${tool === 'wall' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">pen_size_2</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">Wall</span>
                        </button>

                        <button
                            onClick={() => { setTool('space'); setActiveShape('rectangle'); setSelectedIds([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${(tool === 'space' && activeShape === 'rectangle') ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">rectangle</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">Rect</span>
                        </button>

                        <button
                            onClick={() => { setTool('space'); setActiveShape('circle'); setSelectedIds([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${(tool === 'space' && activeShape === 'circle') ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">circle</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">Circle</span>
                        </button>

                        <button
                            onClick={() => { setTool('plant'); setActiveShape('circle'); setSelectedId(null); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${tool === 'plant' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">park</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1 text-emerald-700">Plant</span>
                        </button>

                        <button
                            onClick={() => { setTool('triangle'); setSelectedIds([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${tool === 'triangle' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">architecture</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">Tri</span>
                        </button>

                        <button
                            onClick={() => { setTool('polygon'); setSelectedIds([]); }}
                            className={`flex flex-col items-center justify-center py-2.5 w-full rounded-lg transition-all duration-150 ease-in-out group ${tool === 'polygon' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">polyline</span>
                            <span className="font-['Inter'] uppercase tracking-widest text-[7px] font-bold mt-1">Poly</span>
                        </button>
                    </div>

                    <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-4 w-full items-center text-slate-400 font-bold uppercase tracking-tighter">
                        <button className="w-10 h-10 flex items-center justify-center hover:text-blue-600 hover:bg-white rounded-md" title="Settings"><span className="material-symbols-outlined text-[18px]">settings</span></button>
                    </div>
                </aside>

                {/* Main Canvas Area */}
                <main
                    className={`flex-1 ml-16 mr-72 relative overflow-hidden bg-slate-50 ${isAltPressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : (tool === 'select' ? 'cursor-default' : 'crosshair')}`}
                    onPointerDown={(e) => {
                        const targetId = (e.target as any).id
                        handlePointerDown(e)
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                >
                    <svg
                        ref={svgRef}
                        className="w-full h-full absolute inset-0"
                        style={{ touchAction: 'none' }}
                    >
                        <defs>
                            <pattern id="grid-major" width={GRID_1M} height={GRID_1M} patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1.2" fill="#cbd5e1" />
                            </pattern>
                            <pattern id="grid-minor" width={GRID_1M / 5} height={GRID_1M / 5} patternUnits="userSpaceOnUse">
                                <circle cx="0.5" cy="0.5" r="0.6" fill="#e2e8f0" />
                            </pattern>

                            {/* Professional Landscape Surface Textures */}
                            <pattern id="pattern-lawn" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="0.8" fill="#10b981" opacity="0.6" />
                                <path d="M 5,2 L 5,5" stroke="#059669" strokeWidth="0.5" opacity="0.4" />
                            </pattern>
                            <pattern id="pattern-shrub" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="3" fill="#065f46" opacity="0.2" />
                                <path d="M 10,10 A 4,4 0 0,1 14,6" fill="none" stroke="#059669" strokeWidth="1" opacity="0.4" />
                            </pattern>
                            <pattern id="pattern-stone" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="5" cy="5" r="2" fill="#94a3b8" />
                                <circle cx="15" cy="12" r="1.5" fill="#cbd5e1" />
                                <path d="M 0,0 L 20,20" stroke="#f1f5f9" strokeWidth="0.5" />
                            </pattern>
                            <pattern id="pattern-water" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 0,20 Q 10,15 20,20 T 40,20" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                                <path d="M 0,30 Q 10,25 20,30 T 40,30" fill="none" stroke="#60a5fa" strokeWidth="0.8" opacity="0.2" />
                            </pattern>
                            <pattern id="pattern-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#94a3b8" strokeWidth="0.2" opacity="0.5" />
                            </pattern>
                        </defs>

                        {/* Transformable Grid */}
                        <g
                            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                            style={{ pointerEvents: tool === 'select' ? 'auto' : 'none' }}
                        >
                            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid-minor)" />
                            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid-major)" />

                            {/* Selection Marquee */}
                            {isSelecting && selectionBox && (
                                <rect
                                    x={Math.min(selectionBox.start.x, selectionBox.end.x)}
                                    y={Math.min(selectionBox.start.y, selectionBox.end.y)}
                                    width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
                                    height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
                                    fill="rgba(59, 130, 246, 0.1)"
                                    stroke="#3b82f6"
                                    strokeWidth={1 / zoom}
                                    strokeDasharray="4,2"
                                    pointerEvents="none"
                                />
                            )}

                            {elements.filter(el => {
                                const layer = layers.find(l => l.id === el.layerId)
                                return !el.layerId || !layer || layer.visible !== false
                            }).map(el => (
                                <PrecisionElement
                                    key={el.id}
                                    element={el}
                                    isSelected={selectedIds.includes(el.id)}
                                    zoom={zoom}
                                    onPointerDown={(e: any) => {
                                        const layer = layers.find(l => l.id === el.layerId)
                                        if (tool === 'select' && (!layer || !layer.locked)) {
                                            e.stopPropagation();
                                            const coords = getMouseCoords(e);
                                            if (!selectedIds.includes(el.id)) {
                                                setSelectedIds([el.id]);
                                            }
                                            setIsMoving(true);
                                            const ox = el.x !== undefined ? coords.x - el.x : 0
                                            const oy = el.y !== undefined ? coords.y - el.y : 0
                                            setMouseGrabOffset({ x: ox, y: oy });
                                        }
                                    }}
                                    onUpdate={(newEl: any) => {
                                        const next = elements.map(it => it.id === newEl.id ? newEl : it)
                                        setElements(next); addToHistory(next)
                                    }}
                                    onStartCurving={(id: string, idx: number) => {
                                        setIsCurving(true); setCurvingElementId(id); setCurvingEdgeIndex(idx);
                                    }}
                                    unitDisplay={unit}
                                    showLabels={showLabels}
                                />
                            ))}
                            {isDrawing && currentElement && <PrecisionElement element={currentElement} isSelected={true} unitDisplay={unit} zoom={zoom} showLabels={showLabels} onPointerDown={() => { }} />}
                            {polyPoints.length > 0 && (
                                <polyline
                                    points={([...polyPoints, mousePos]).map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth={2 / zoom}
                                    strokeDasharray="4,2"
                                />
                            )}
                            {activeGuides.map((g, it) => (
                                <line key={it} x1={g.type === 'v' ? g.pos : -5000} y1={g.type === 'h' ? g.pos : -5000} x2={g.type === 'v' ? g.pos : 5000} y2={g.type === 'h' ? g.pos : 5000} stroke="#3b82f6" strokeWidth={0.5 / zoom} strokeDasharray="5,3" opacity="0.4" />
                            ))}

                            {/* Snap Feedback Ring */}
                            {snapPoint && (
                                <g pointerEvents="none">
                                    <circle cx={snapPoint.x} cy={snapPoint.y} r={10 / zoom} fill="rgba(59, 130, 246, 0.15)" className="animate-ping" />
                                    <circle cx={snapPoint.x} cy={snapPoint.y} r={4 / zoom} fill="#3b82f6" />
                                </g>
                            )}

                            {/* Fusion Indicator & NEXUS GHOST */}
                            {previewFusionPoints && (
                                <g pointerEvents="none">
                                    <path
                                        d={getCurvePath(previewFusionPoints)}
                                        fill="rgba(59, 130, 246, 0.2)"
                                        stroke="#3b82f6"
                                        strokeWidth={3 / zoom}
                                        strokeDasharray="6,3"
                                        className="animate-pulse"
                                    />
                                    {previewFusionPoints.map((p, i) => (
                                        <circle key={i} cx={p.x} cy={p.y} r={3 / zoom} fill="#3b82f6" />
                                    ))}
                                    <text
                                        x={mousePos.x}
                                        y={mousePos.y - 30 / zoom}
                                        textAnchor="middle"
                                        className="mono font-black text-[10px] fill-blue-600 uppercase tracking-widest"
                                        transform={`scale(${1 / zoom})`}
                                        style={{ transformOrigin: `${mousePos.x}px ${mousePos.y}px` }}
                                    >
                                        NEXUS READY: PRESS [M] TO FUSE
                                    </text>
                                </g>
                            )}

                            {fusionTargetId && !previewFusionPoints && (
                                <g pointerEvents="none">
                                    <path
                                        d={getCurvePath(elements.find(el => el.id === fusionTargetId)?.points || [], elements.find(el => el.id === fusionTargetId)?.bulges || [])}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth={8 / zoom}
                                        opacity="0.3"
                                        className="animate-pulse"
                                    />
                                </g>
                            )}

                            {/* V21: GHOST PRECISION PREVIEW */}
                            {ghostSnapElement && (
                                <g pointerEvents="none">
                                    <PrecisionElement
                                        element={{ ...ghostSnapElement, fill: 'transparent', stroke: '#3b82f6', strokeWidth: 2 / zoom, lineStyle: 'dashed' }}
                                        zoom={zoom}
                                        unitDisplay={unit}
                                    />
                                    <g transform={`translate(${ghostSnapElement.x}, ${ghostSnapElement.y - 20 / zoom}) scale(${0.8 / zoom})`}>
                                        <rect width="90" height="15" rx="2" fill="#3b82f6" />
                                        <text x="45" y="11" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" className="mono uppercase tracking-tighter">NEXUS TARGET</text>
                                    </g>
                                </g>
                            )}

                            {/* Dynamic Crosshair Guide */}
                            {!isPanning && !isMoving && (
                                <g pointerEvents="none">
                                    <line x1={mousePos.x} y1="-5000" x2={mousePos.x} y2="5000" stroke="#3b82f6" strokeWidth={0.5 / zoom} strokeDasharray="4,4" opacity="0.4" />
                                    <line x1="-5000" y1={mousePos.y} x2="5000" y2={mousePos.y} stroke="#3b82f6" strokeWidth={0.5 / zoom} strokeDasharray="4,4" opacity="0.4" />
                                    <g transform={`translate(${mousePos.x + 10 / zoom}, ${mousePos.y + 10 / zoom}) scale(${1 / zoom})`}>
                                        <rect width="70" height="20" rx="4" fill="rgba(37, 99, 235, 0.9)" />
                                        <text x="35" y="13" textAnchor="middle" fontSize="10" fontWeight="800" fill="white" className="mono">
                                            {fmtD(mousePos.x)} , {fmtD(mousePos.y)}
                                        </text>
                                    </g>
                                </g>
                            )}
                        </g>
                    </svg>

                    {/* Selection HUD */}
                    {selectedIds.length > 0 && (
                        <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-2 border border-slate-200 rounded-lg shadow-sm flex items-center gap-4 z-50">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Selected</span>
                            {selectedIds.length === 1 ? (
                                <>
                                    <span className="text-[11px] mono font-semibold text-blue-600">{selectedElement?.name || selectedIds[0]}</span>
                                    <div className="w-px h-3 bg-slate-200"></div>
                                    <span className="text-[11px] mono text-slate-500">Shape: {(selectedElement?.shape || selectedElement?.type || 'Element').toUpperCase()}</span>
                                </>
                            ) : (
                                <span className="text-[11px] mono font-semibold text-blue-600">{selectedIds.length} OBJECTS SELECTED</span>
                            )}
                        </div>
                    )}

                    {/* Floating Action Bar */}
                    <div className="absolute top-6 right-6 flex flex-col gap-2">
                        <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-600 transition-all"><span className="material-symbols-outlined text-[20px]">zoom_in</span></button>
                        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-600 transition-all"><span className="material-symbols-outlined text-[20px]">zoom_out</span></button>
                        <div className="h-px bg-slate-200 my-1"></div>
                        <button
                            disabled={historyIndex <= 0}
                            onClick={(e) => { e.stopPropagation(); undo(); }}
                            className={`p-2 bg-white border border-slate-200 rounded-md shadow-sm transition-all ${historyIndex <= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">undo</span>
                        </button>
                        <button
                            disabled={historyIndex >= history.length - 1}
                            onClick={(e) => { e.stopPropagation(); redo(); }}
                            className={`p-2 bg-white border border-slate-200 rounded-md shadow-sm transition-all ${historyIndex >= history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">redo</span>
                        </button>
                        <div className="h-px bg-slate-200 my-1"></div>
                        <button onClick={() => { if (selectedIds.length > 0) { const next = elements.filter(el => !selectedIds.includes(el.id)); setElements(next); addToHistory(next); setSelectedIds([]); } }} className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-red-50 hover:text-red-600 text-slate-400 transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                    </div>
                </main>

                {/* Right Panel (Properties & Layers) */}
                <aside className="fixed right-0 top-14 bottom-12 w-72 bg-white border-l border-slate-200 flex flex-col z-40">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Properties Section */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-blue-600 text-[18px]">settings_input_component</span>
                                <h3 className="headline text-[11px] font-bold tracking-widest text-slate-900 uppercase">Properties</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Entity Type</label>
                                    <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
                                        <p className="mono text-xs text-slate-700">{selectedElement ? (selectedElement.shape || selectedElement.type).toUpperCase() : 'None Selected'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">{selectedElement?.points ? 'Perimeter / Length' : 'Net Area'}</label>
                                        <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100 ring-1 ring-blue-100 bg-blue-50/30">
                                            <p className="mono text-blue-600 font-semibold text-[13px]">
                                                {selectedElement ? (
                                                    selectedElement.points
                                                        ? fmtD(selectedElement.points.reduce((acc: number, p: Point, i: number) => i < selectedElement.points.length - 1 ? acc + Math.hypot(selectedElement.points[i + 1].x - p.x, selectedElement.points[i + 1].y - p.y) : acc, 0))
                                                        : fmtA(selectedElement.w * selectedElement.h)
                                                ) : '0.00 m²'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Total Workshop Area</label>
                                        <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100 ring-1 ring-blue-100 bg-blue-50/30">
                                            <p className="mono text-blue-600 font-semibold text-[13px]">{fmtA(totalArea * (PIXELS_PER_METER ** 2))}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Material / Fill</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {['rgba(74,103,65,0.2)', 'rgba(59,130,246,0.2)', 'rgba(239,68,68,0.2)', 'rgba(245,158,11,0.2)', 'rgba(0,0,0,0.05)'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    if (selectedIds.length > 0) setElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, fill: c } : el))
                                                }}
                                                style={{ backgroundColor: c }}
                                                className={`w-full aspect-square rounded border border-slate-200 transition-transform active:scale-95 ${selectedElement?.fill === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {/* Plant Type Switcher */}
                                {selectedElement?.type === 'plant' && (
                                    <div className="pt-2">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Botanical Level</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'tree', label: 'Large Tree', icon: 'park' },
                                                { id: 'shrub', label: 'Shrub', icon: 'grass' },
                                                { id: 'palm', label: 'Palm/Tropical', icon: 'forest' },
                                                { id: 'ground', label: 'Groundcover', icon: 'grain' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, plantType: p.id } : el))
                                                    }}
                                                    className={`flex items-center gap-2 p-2 rounded border transition-all text-[10px] font-bold uppercase tracking-tighter ${selectedElement?.plantType === p.id || (!selectedElement?.plantType && p.id === 'tree') ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Surface Texture Switcher */}
                                {(selectedElement?.type === 'space' || selectedElement?.shape === 'polygon' || selectedElement?.shape === 'rectangle') && (
                                    <div className="pt-2">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Surface Texture (Garden Hatch)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: null, label: 'Solid Color', icon: 'square' },
                                                { id: 'lawn', label: 'Meadow/Lawn', icon: 'eco' },
                                                { id: 'shrub', label: 'Mass Shrub', icon: 'grass' },
                                                { id: 'stone', label: 'Pebble/Mulch', icon: 'grain' },
                                                { id: 'water', label: 'Water Body', icon: 'waves' }
                                            ].map(p => (
                                                <button
                                                    key={p.id || 'none'}
                                                    onClick={() => {
                                                        setElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, surfaceType: p.id } : el))
                                                    }}
                                                    className={`flex items-center gap-2 p-2 rounded border transition-all text-[10px] font-bold uppercase tracking-tighter ${selectedElement?.surfaceType === p.id ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Botanical Inventory Manager */}
                                {(selectedElement?.type === 'space' || selectedElement?.shape === 'polygon' || selectedElement?.shape === 'rectangle') && (
                                    <div className="pt-2 border-t border-slate-100 mt-4">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Botanical Inventory (Species List)</label>

                                        <div className="space-y-2 mb-4">
                                            {(selectedElement.inventory || []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 rounded p-2 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-700">{item.name || 'Unnamed Species'}</span>
                                                        <span className="text-[8px] uppercase text-emerald-600 font-bold">{item.type} • {item.qty} units</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, inventory: el.inventory.filter((_: any, i: number) => i !== idx) } : el))
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {(!selectedElement.inventory || selectedElement.inventory.length === 0) && (
                                                <div className="text-center py-4 bg-slate-50/50 rounded border border-dashed border-slate-200">
                                                    <p className="text-[10px] text-slate-400 italic">No species assigned to this zone</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    id="new-species-name"
                                                    type="text"
                                                    placeholder="Species Name..."
                                                    className="text-[10px] p-2 rounded border border-emerald-200 bg-white focus:ring-1 focus:ring-emerald-500 outline-none col-span-2"
                                                />
                                                <select
                                                    id="new-species-type"
                                                    className="text-[10px] p-2 rounded border border-emerald-200 bg-white outline-none"
                                                >
                                                    <option value="tree">Tree</option>
                                                    <option value="shrub">Shrub</option>
                                                    <option value="palm">Palm</option>
                                                    <option value="ground">Ground</option>
                                                </select>
                                                <input
                                                    id="new-species-qty"
                                                    type="number"
                                                    placeholder="Qty"
                                                    className="text-[10px] p-2 rounded border border-emerald-200 bg-white outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const name = (document.getElementById('new-species-name') as HTMLInputElement).value
                                                    const type = (document.getElementById('new-species-type') as HTMLSelectElement).value
                                                    const qty = (document.getElementById('new-species-qty') as HTMLInputElement).value
                                                    if (!name || !qty) return

                                                    setElements(els => els.map(el => selectedIds.includes(el.id) ? { ...el, inventory: [...(el.inventory || []), { name, type, qty }] } : el))

                                                        // Reset inputs
                                                        ; (document.getElementById('new-species-name') as HTMLInputElement).value = ''
                                                        ; (document.getElementById('new-species-qty') as HTMLInputElement).value = ''
                                                }}
                                                className="w-full bg-emerald-600 text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm"
                                            >
                                                Add to Inventory
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Dimensions Section */}
                                {selectedElement && (
                                    <div className="pt-2">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Edge Dimensions</label>
                                        <div className="space-y-3">
                                            {(() => {
                                                const dims: { label: string, val: number, id: number }[] = []
                                                if (selectedElement.shape === 'rectangle') {
                                                    dims.push({ label: 'Width', val: selectedElement.w, id: 0 }, { label: 'Height', val: selectedElement.h, id: 1 })
                                                } else if (selectedElement.shape === 'circle') {
                                                    const r = Math.hypot(selectedElement.w, selectedElement.h)
                                                    const label = selectedElement.type === 'plant' ? 'Spread (D)' : 'Radius'
                                                    dims.push({ label, val: r * (selectedElement.type === 'plant' ? 2 : 1), id: 0 })
                                                } else if (selectedElement.points) {
                                                    selectedElement.points.forEach((p: Point, i: number) => {
                                                        const next = selectedElement.points[(i + 1) % selectedElement.points.length];
                                                        if (selectedElement.shape === 'triangle' && i === 2) return;
                                                        dims.push({ label: `Edge ${i + 1}`, val: Math.hypot(next.x - p.x, next.y - p.y), id: i })
                                                    })
                                                } else if (selectedElement.type === 'wall' || selectedElement.shape === 'line') {
                                                    dims.push({ label: 'Length', val: Math.hypot(selectedElement.x2 - selectedElement.x, selectedElement.y2 - selectedElement.y), id: 0 })
                                                }

                                                return dims.map(d => (
                                                    <div key={d.id} className="flex items-center justify-between gap-4">
                                                        <span className="text-[10px] mono text-slate-500">{d.label}</span>
                                                        <div className="flex-1 flex max-w-[100px] items-center bg-slate-50 border border-slate-100 rounded px-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-full bg-transparent border-none text-[12px] mono text-blue-600 focus:ring-0 p-1"
                                                                value={Number((d.val / PIXELS_PER_METER).toFixed(2))}
                                                                onChange={(e) => {
                                                                    const nv = parseFloat(e.target.value) || 0
                                                                    setElements(els => els.map(el => {
                                                                        if (el.id !== selectedId) return el
                                                                        const npx = nv * PIXELS_PER_METER
                                                                        if (el.shape === 'rectangle') {
                                                                            return d.id === 0 ? { ...el, w: npx } : { ...el, h: npx }
                                                                        }
                                                                        if (el.shape === 'circle') {
                                                                            const isP = el.type === 'plant'
                                                                            const tv = isP ? npx / 2 : npx
                                                                            return { ...el, w: tv, h: 0 }
                                                                        }
                                                                        if (el.points) {
                                                                            const p1 = el.points[d.id]
                                                                            const p2 = el.points[(d.id + 1) % el.points.length]
                                                                            const cl = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1
                                                                            const dx = (p2.x - p1.x) / cl * npx; const dy = (p2.y - p1.y) / cl * npx
                                                                            const newP2 = { x: p1.x + dx, y: p1.y + dy }
                                                                            const diffX = newP2.x - p2.x; const diffY = newP2.y - p2.y
                                                                            return { ...el, points: el.points.map((p: any, idx: number) => idx > d.id ? { x: p.x + diffX, y: p.y + diffY } : p) }
                                                                        }
                                                                        if (el.type === 'wall' || el.shape === 'line') {
                                                                            const cl = Math.hypot(el.x2 - el.x, el.y2 - el.y) || 1
                                                                            return { ...el, x2: el.x + (el.x2 - el.x) / cl * npx, y2: el.y + (el.y2 - el.y) / cl * npx }
                                                                        }
                                                                        return el
                                                                    }))
                                                                }}
                                                            />
                                                            <span className="text-[9px] font-bold text-slate-400">m</span>
                                                        </div>
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Layers Section */}
                        <div className="p-6 flex-1 overflow-y-auto border-t border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">layers</span>
                                    <h3 className="headline text-[11px] font-bold tracking-widest text-slate-900 uppercase">Architecture Layers</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const id = prompt('Enter Master Layer Name:', 'Merged Layout')
                                            if (!id) return
                                            const masterId = 'master-' + Math.random().toString(36).substr(2, 5)
                                            setElements(els => els.map(el => ({ ...el, layerId: masterId })))
                                            setLayers([{ id: masterId, name: id, visible: true, locked: false }])
                                            setActiveLayerId(masterId)
                                        }}
                                        title="Merge All Into Master"
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">compress</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const id = Math.random().toString(36).substr(2, 5)
                                            setLayers([...layers, { id, name: `Layer ${layers.length + 1}`, visible: true, locked: false }])
                                            setActiveLayerId(id)
                                        }}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {layers.map(layer => (
                                    <div
                                        key={layer.id}
                                        onClick={() => !layer.locked && setActiveLayerId(layer.id)}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group cursor-pointer ${activeLayerId === layer.id ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLayers(ls => ls.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)) }}
                                                className={`material-symbols-outlined text-[18px] ${layer.visible ? 'text-emerald-500' : 'text-slate-300'}`}
                                            >
                                                {layer.visible ? 'visibility' : 'visibility_off'}
                                            </button>
                                            <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${activeLayerId === layer.id ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                {layer.name}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLayers(ls => ls.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)) }}
                                                className={`material-symbols-outlined text-[16px] ${layer.locked ? 'text-amber-500' : 'text-slate-300'}`}
                                            >
                                                {layer.locked ? 'lock' : 'lock_open'}
                                            </button>
                                            {layers.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setElements(els => els.filter(el => el.layerId !== layer.id));
                                                        setLayers(ls => ls.filter(l => l.id !== layer.id));
                                                        if (activeLayerId === layer.id) setActiveLayerId(layers[0].id)
                                                    }}
                                                    className="material-symbols-outlined text-[16px] text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                    {/* Quick Controls */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setUnit(unit === 'm' ? 'cm' : 'm')}
                            className="flex flex-col items-center py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:border-blue-300 transition-all text-slate-600"
                        >
                            <span className="material-symbols-outlined text-[16px]">straighten</span>
                            <span className="text-[7px] uppercase font-black mt-1">{unit === 'm' ? 'METERS' : 'CM'}</span>
                        </button>
                        <button className="flex flex-col items-center py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:border-blue-300 transition-all text-slate-600">
                            <span className="material-symbols-outlined text-[16px]">line_weight</span>
                            <span className="text-[7px] uppercase font-black mt-1">Weight</span>
                        </button>
                        <button className="flex flex-col items-center py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:border-blue-300 transition-all text-slate-600">
                            <span className="material-symbols-outlined text-[16px]">3d_rotation</span>
                            <span className="text-[7px] uppercase font-black mt-1">3D View</span>
                        </button>
                    </div>
                </aside>
            </div>

            {/* BottomNavBar */}
            <footer className="fixed bottom-0 w-full h-12 z-50 bg-white border-t border-slate-200 flex justify-start items-center px-6 gap-8">
                <div className="flex items-center gap-2 cursor-default group">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-600">location_searching</span>
                    <span className="font-mono text-[11px] tracking-tight text-slate-900 uppercase">X: {fmtD(mousePos.x)} Y: {fmtD(mousePos.y)}</span>
                </div>
                <div className="flex items-center gap-2 cursor-default group">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-600">aspect_ratio</span>
                    <span className="font-mono text-[11px] tracking-tight text-slate-900">Scale {(zoom * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2 cursor-default group">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">grid_4x4</span>
                    <span className="font-mono text-[11px] tracking-tight text-blue-700 font-bold">Grid: Dynamic</span>
                </div>
                <div className="flex items-center gap-2 cursor-default group">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-600">straighten</span>
                    <span className="font-mono text-[11px] tracking-tight text-slate-900">{unit === 'm' ? 'Metric' : 'Centimetric'}</span>
                </div>

                {/* Functional Status Toggles */}
                <div className="ml-auto flex items-center h-full gap-6">
                    <div
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        className={`flex items-center gap-2 px-3 py-1 border rounded-full cursor-pointer transition-all ${snapEnabled ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                        <span className={`text-[9px] uppercase font-black ${snapEnabled ? 'text-blue-500' : 'text-slate-400'}`}>Snap:</span>
                        <span className={`text-[9px] font-black uppercase ${snapEnabled ? 'text-blue-600' : 'text-slate-400'}`}>{snapEnabled ? 'Active' : 'Off'}</span>
                    </div>
                    <div
                        onClick={() => setShowLabels(!showLabels)}
                        className={`flex items-center gap-2 px-3 py-1 border rounded-full cursor-pointer transition-all ${showLabels ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                        <span className={`text-[9px] uppercase font-black ${showLabels ? 'text-indigo-500' : 'text-slate-400'}`}>Labels:</span>
                        <span className={`text-[9px] font-black uppercase ${showLabels ? 'text-indigo-600' : 'text-slate-400'}`}>{showLabels ? 'Show' : 'Hide'}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-3 text-slate-300">
                        <span className="material-symbols-outlined text-[16px]">wifi</span>
                        <span className="material-symbols-outlined text-[16px]">database</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function PrecisionElement({ element, isSelected, onPointerDown, onUpdate, onStartCurving, unitDisplay, zoom, showLabels }: any) {
    const selectionProps = isSelected ? { strokeDasharray: "4,4" } : {}
    const fmtD = (px: number) => (unitDisplay === 'm' ? `${(px / PIXELS_PER_METER).toFixed(2)}m` : `${Math.round(px / PIXELS_PER_METER * 100)}cm`)
    const fmtA = (sqpx: number) => (unitDisplay === 'm' ? `${(sqpx / (PIXELS_PER_METER ** 2)).toFixed(2)} m²` : `${(sqpx / (PIXELS_PER_METER ** 2) * 10000).toLocaleString()} cm²`)

    let body: any = null; let center = { x: 0, y: 0 }; let areaSqm = 0
    let edges: [Point, Point][] = []
    const isLabeled = ['space', 'triangle', 'polygon'].includes(element.type)

    if (element.shape === 'polygon' || element.shape === 'triangle') {
        const pts = element.points || []
        const bulges = element.bulges || []
        const fillValue = (element.surfaceType && element.surfaceType !== 'solid') ? `url(#pattern-${element.surfaceType})` : element.fill

        body = (
            <g color={element.stroke}>
                <path id={element.id} d={getCurvePath(pts, bulges)} fill={fillValue} stroke={element.stroke} strokeWidth={element.strokeWidth || 2} onPointerDown={onPointerDown} className="cursor-pointer" {...selectionProps} />
                {isSelected && pts.map((p: Point, i: number) => {
                    const next = pts[(i + 1) % pts.length]
                    const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
                    return (
                        <circle key={`b-${i}`} cx={mid.x} cy={mid.y} r={6 / zoom} fill="#3b82f6" stroke="white" strokeWidth={1 / zoom} className="cursor-pointer hover:fill-blue-600 transition-colors" onPointerDown={(e) => {
                            e.stopPropagation()
                            if (e.altKey) {
                                const newPts = [...pts]; newPts.splice(i + 1, 0, mid)
                                const newBulges = [...bulges]; newBulges.splice(i + 1, 0, 0)
                                onUpdate({ ...element, points: newPts, bulges: newBulges })
                            } else {
                                onStartCurving(element.id, i)
                            }
                        }}
                        />
                    )
                })}
            </g>
        )
        center = pts.reduce((acc: any, p: any) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 });
        areaSqm = calculatePolygonArea(pts, bulges)
        pts.forEach((p: Point, i: number) => edges.push([p, pts[(i + 1) % pts.length]]))
    } else if (element.shape === 'rectangle') {
        const fillValue = element.surfaceType && element.surfaceType !== 'solid' ? `url(#pattern-${element.surfaceType})` : element.fill
        body = (
            <g color={element.stroke}>
                <rect id={element.id} x={element.x} y={element.y} width={element.w} height={element.h} fill={fillValue} stroke={element.stroke} strokeWidth={element.strokeWidth || 2} onPointerDown={onPointerDown} className="cursor-pointer" {...selectionProps} />
            </g>
        )
        center = { x: element.x + element.w / 2, y: element.y + element.h / 2 }; areaSqm = Math.abs(element.w * element.h)
        const p1 = { x: element.x, y: element.y }, p2 = { x: element.x + element.w, y: element.y }, p3 = { x: element.x + element.w, y: element.y + element.h }, p4 = { x: element.x, y: element.y + element.h }
        edges.push([p1, p2], [p2, p3], [p3, p4], [p4, p1])
    } else if (element.shape === 'circle') {
        const r = Math.hypot(element.w, element.h)
        const isP = element.type === 'plant'
        body = (
            <g>
                {isP ? (
                    <g transform={`translate(${element.x}, ${element.y})`} onPointerDown={onPointerDown} className="cursor-pointer">
                        {(() => {
                            const pt = element.plantType || 'tree'
                            if (pt === 'tree') return (
                                <g>
                                    <circle r={r} fill="rgba(20, 83, 45, 0.05)" stroke="#064e3b" strokeWidth={1 / zoom} strokeDasharray="3,1" />
                                    <path d={`M ${r},0 ${Array.from({ length: 12 }).map((_, i) => { const a = (i + 1) * (Math.PI * 2 / 12); return `A ${r / 4},${r / 4} 0 0,1 ${Math.cos(a) * r},${Math.sin(a) * r}` }).join(' ')} Z`} fill="none" stroke="#064e3b" strokeWidth={1.5 / zoom} />
                                    <circle r={r * 0.06} fill="#064e3b" />
                                    <g opacity="0.3" stroke="#064e3b" strokeWidth={0.5 / zoom}>{Array.from({ length: 8 }).map((_, i) => (<line key={i} x1={0} y1={0} x2={Math.cos(i * Math.PI / 4) * r * 0.8} y2={Math.sin(i * Math.PI / 4) * r * 0.8} />))}</g>
                                </g>
                            )
                            if (pt === 'shrub') return (
                                <g>
                                    <circle r={r} fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" strokeWidth={1 / zoom} strokeDasharray="1,1" />
                                    {Array.from({ length: 8 }).map((_, i) => <circle key={i} cx={Math.cos(i * Math.PI / 4) * r * 0.6} cy={Math.sin(i * Math.PI / 4) * r * 0.6} r={r * 0.3} fill="#10b981" opacity="0.2" />)}
                                    <circle r={r * 0.1} fill="#65a30d" />
                                </g>
                            )
                            if (pt === 'palm') return (
                                <g>
                                    {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M 0,0 Q ${Math.cos(i * Math.PI / 5) * r * 1.1},${Math.sin(i * Math.PI / 5) * r * 1.1} ${Math.cos(i * Math.PI / 5 + 0.1) * r},${Math.sin(i * Math.PI / 5 + 0.1) * r} Z`} fill="#047857" opacity="0.6" />)}
                                    <circle r={r * 0.15} fill="#064e3b" stroke="white" strokeWidth={0.5 / zoom} />
                                </g>
                            )
                            if (pt === 'ground') return (
                                <g>{Array.from({ length: 12 }).map((_, i) => (<circle key={i} cx={(Math.random() - 0.5) * r * 1.5} cy={(Math.random() - 0.5) * r * 1.5} r={r * 0.15} fill="#a3e635" opacity="0.4" stroke="#4d7c0f" strokeWidth={0.5 / zoom} />))}</g>
                            )
                            return null
                        })()}
                        <circle id={element.id} r={r} fill="transparent" />
                    </g>
                ) : (
                    <circle id={element.id} cx={element.x} cy={element.y} r={r} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth || 2} onPointerDown={onPointerDown} className="cursor-pointer" {...selectionProps} />
                )}
            </g>
        )
        center = { x: element.x, y: element.y }; areaSqm = Math.PI * r * r
        body = (
            <g key={element.id + '_dim'}>
                <g transform={`translate(${element.x}, ${element.y})`} pointerEvents="none">
                    <line x1={-r} y1="0" x2={r} y2="0" stroke="#064e3b" strokeWidth={0.5 / zoom} strokeDasharray="2,2" opacity="0.3" />
                    <g transform={`translate(0, ${-r - 10 / zoom}) scale(${1 / zoom})`}>
                        <rect x="-25" y="-8" width="50" height="16" rx="4" fill="white" fillOpacity="0.9" stroke="#cbd5e1" strokeWidth="0.5" />
                        <text dy="3.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#064e3b" className="mono select-none">D: {fmtD(r * 2)}</text>
                    </g>
                </g>
                {body}
            </g>
        )
    } else if (element.type === 'wall' || element.type === 'boundary' || element.shape === 'line') {
        const pts = element.points || [{ x: element.x, y: element.y }, { x: element.x2, y: element.y2 }]
        body = (
            <g>
                <path id={element.id} d={pts.map((p: Point, i: number) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ')} fill="none" stroke={element.stroke} strokeWidth={element.strokeWidth || 2} onPointerDown={onPointerDown} {...selectionProps} />
            </g>
        )
        edges = []
        pts.forEach((p: Point, i: number) => { if (i < pts.length - 1) edges.push([p, pts[i + 1]]) })
    }

    return (
        <g>
            {body}
            {edges.map(([a, b], i) => {
                const len = Math.hypot(b.x - a.x, b.y - a.y)
                if (len < 10) return null
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
                const angle = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI)
                const textAngle = angle > 90 || angle < -90 ? angle + 180 : angle
                return (
                    <g key={i} transform={`translate(${mid.x}, ${mid.y}) scale(${1 / zoom}) rotate(${textAngle})`} pointerEvents="none">
                        <rect x="-20" y="-8" width="40" height="16" rx="4" fill="white" fillOpacity="0.9" stroke="#cbd5e1" strokeWidth="0.5" />
                        <text dy="3.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" className="mono select-none tracking-tighter">{fmtD(len)}</text>
                    </g>
                )
            })}
            {showLabels && isLabeled && areaSqm > 10 && (
                <g transform={`translate(${center.x}, ${center.y}) scale(${1 / zoom})`} pointerEvents="none">
                    <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#1e293b" fillOpacity="0.9" stroke="white" strokeWidth="0.5" />
                    <text dy="5" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" className="headline">{fmtA(areaSqm)}</text>
                </g>
            )}
        </g>
    )
}


function ToolBtn({ icon, active, onClick, label }: any) {
    return (
        <button className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all relative group mb-3 shadow-md ${active ? 'bg-[#2a4532] text-white shadow-xl' : 'text-gray-300 hover:text-green-800 bg-white'}`} onClick={onClick}>
            {icon}
            <span className="absolute left-[110%] bg-white border border-[#f3f3ef] text-[9px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 uppercase transition-opacity pointer-events-none z-50 tracking-widest shadow-xl whitespace-nowrap">{label}</span>
        </button>
    )
}

function PortfolioList({ customerId, onSelect }: { customerId: string, onSelect: (id: string) => void }) {
    const [houses, setHouses] = useState<House[]>([])
    useEffect(() => { getCustomerHouses(customerId).then(({ data }) => setHouses(data || [])) }, [customerId])
    return (
        <div className="space-y-1">
            {houses.map(h => (
                <button key={h.id} onClick={() => onSelect(h.id)} className="w-full flex items-center gap-4 p-4 hover:bg-white rounded-3xl group transition-all border border-transparent shadow-sm hover:shadow-xl">
                    <div className="w-10 h-10 rounded-xl bg-[#f7f7f2] group-hover:bg-[#2a4532] group-hover:text-white flex items-center justify-center text-gray-400 transition-all"><Home size={20} /></div>
                    <div className="flex-1 text-left overflow-hidden"><div className="text-xs font-black truncate uppercase tracking-tight">{h.name}</div><div className="text-[9px] text-gray-400 font-bold truncate uppercase">{h.address || 'Standard Plot'}</div></div>
                </button>
            ))}
        </div>
    )
}
