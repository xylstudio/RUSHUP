'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  StandaloneSearchBox,
} from '@react-google-maps/api'
import { X, MapPin, Navigation, Check, Search } from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import { useI18n } from "@/lib/I18nContext";

interface LocationValue {
  lat: number
  lng: number
  address?: string
}

interface GoogleMapsLocationPickerProps {
  isOpen?: boolean
  onClose?: () => void
  onLocationSelect?: (location: LocationValue) => void
  onSelect?: (location: LocationValue) => void
  initialLocation?: { lat: number; lng: number }
}

const containerStyle = {
  width: '100%',
  height: '100%',
}

const mapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  mapTypeId: 'roadmap' as const,
}

const center_thailand = {
  lat: 13.7563,
  lng: 100.5018,
}

const MAP_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"]

export default function GoogleMapsLocationPicker({
  isOpen,
  onClose,
  onLocationSelect,
  onSelect,
  initialLocation,
}: GoogleMapsLocationPickerProps) {
    const { locale } = useI18n();
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [position, setPosition] = useState(initialLocation || center_thailand)
  const [address, setAddress] = useState('')
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const searchBoxRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isModalMode = typeof isOpen === 'boolean' || typeof onLocationSelect === 'function' || typeof onClose === 'function'

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAP_LIBRARIES,
  })

  // Function to reverse geocode lat/lng to address
  const getAddressFromCoords = useCallback((lat: number, lng: number) => {
    if (!window.google) return
    setIsLoadingAddress(true)
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      setIsLoadingAddress(false)
      if (status === 'OK' && results?.[0]) {
        setAddress(results[0].formatted_address)
      }
    })
  }, [])

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setPosition(newPos)
      getAddressFromCoords(newPos.lat, newPos.lng)
    }
  }, [getAddressFromCoords])

  const onPlacesChanged = () => {
    const places = searchBoxRef.current.getPlaces()
    if (places && places.length > 0) {
      const place = places[0]
      if (place.geometry?.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }
        setPosition(newPos)
        setAddress(place.formatted_address || '')
        map?.panTo(newPos)
        map?.setZoom(17)
      }
    }
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosition(newPos)
        getAddressFromCoords(newPos.lat, newPos.lng)
        map?.panTo(newPos)
        map?.setZoom(17)
      })
    }
  }

  // Effect to sync initialLocation if it changes
  useEffect(() => {
    if (initialLocation && (initialLocation.lat !== position.lat || initialLocation.lng !== position.lng)) {
      setPosition(initialLocation)
      getAddressFromCoords(initialLocation.lat, initialLocation.lng)
    }
  }, [getAddressFromCoords, initialLocation, position.lat, position.lng])

  const repaintMap = useCallback(() => {
    if (!map || !window.google) return

    window.google.maps.event.trigger(map, 'resize')
    map.panTo(position)
  }, [map, position])

  useEffect(() => {
    if (!map || !window.google) return

    const animationFrame = window.requestAnimationFrame(repaintMap)
    const firstTimeoutId = window.setTimeout(repaintMap, 250)
    const secondTimeoutId = window.setTimeout(repaintMap, 800)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(firstTimeoutId)
      window.clearTimeout(secondTimeoutId)
    }
  }, [repaintMap, isOpen])

  useEffect(() => {
    if (!containerRef.current || !map || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      repaintMap()
    })

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [map, repaintMap])
  
  const handleMapLoad = useCallback((instance: google.maps.Map) => {
    setMap(instance)
    
    if (window.google?.maps?.RenderingType?.RASTER) {
      instance.setOptions({
        renderingType: window.google.maps.RenderingType.RASTER,
      })
    }
  }, [])

  const handleConfirm = useCallback(() => {
    const nextValue = { ...position, address }

    onLocationSelect?.(nextValue)
    onSelect?.(nextValue)
    onClose?.()
  }, [address, onClose, onLocationSelect, onSelect, position])

  if (isModalMode && !isOpen) {
    return null
  }

  const content = (
    <div ref={containerRef} className="w-full h-full relative flex flex-col">

      <div className="flex-1 relative">
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerClassName="google-map-container"
              mapContainerStyle={containerStyle}
              center={position}
              zoom={15}
              onClick={onMapClick}
              onLoad={handleMapLoad}
              options={mapOptions}
            >
              <Marker 
                position={position} 
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: '#111111',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF',
                  scale: 2,
                  anchor: new google.maps.Point(12, 22),
                }}
              />
            </GoogleMap>

            <div className="absolute top-6 left-6 right-6 z-10">
              <div className="max-w-xl mx-auto flex items-center gap-2 bg-white p-2 border border-[#111111] shadow-2xl">
                <Search size={18} className="ml-3 text-[#A3A3A3]" />
                <StandaloneSearchBox
                  onLoad={(ref) => (searchBoxRef.current = ref)}
                  onPlacesChanged={onPlacesChanged}
                >
                  <input
                    type="text"
                    placeholder={locale === 'en' ? 'Search for a place or type an address...' : locale === 'zh' ? '搜索地点或输入地址...' : 'ค้นหาสถานที่หรือพิมพ์ที่อยู่...'}
                    className="flex-1 py-3 px-2 text-xs font-medium outline-none"
                  />
                </StandaloneSearchBox>
                <button 
                  onClick={handleGetCurrentLocation}
                  className="p-3 bg-[#FAFAFA] hover:bg-[#EFEFEF] transition-colors text-[#111111]"
                >
                  <Navigation size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="absolute bottom-8 left-6 right-6 z-10 flex flex-col items-center">
              <div className="w-full max-w-xl bg-[#111111] text-white p-6 border border-[#111111] shadow-2xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-white/20 mt-1">
                    <MapPin size={18} strokeWidth={1.5} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[7px] font-black opacity-40 uppercase tracking-[0.5em] mb-1">Architectural coordinate</div>
                    <div className="text-[10px] font-medium leading-relaxed max-w-[240px]">
                      {isLoadingAddress ? (
                        <span className="animate-pulse opacity-50">Determining specific address...</span>
                      ) : address || 'Select location on map'}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[7px] font-black opacity-30 uppercase tracking-[0.3em]">
                       <span>LAT: {position.lat.toFixed(6)}</span>
                       <span>LNG: {position.lng.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#FAFAFA]">
            <XYLLoader tagline="Initialising Mapping Interface" />
          </div>
        )}
      </div>

      <div className="bg-white border-t border-[#EFEFEF] px-6 py-6 z-[20]">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[#111111] text-white py-5 font-bold text-[10px] uppercase tracking-[0.8em] transition-all hover:tracking-[1em] hover:bg-[#1A3626] flex items-center justify-center gap-3"
        >
          CONFIRM PIN <Check size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )

  if (isModalMode) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col pt-20">
        <div className="absolute top-0 left-0 w-full h-20 border-b flex items-center justify-between px-6 z-50 bg-white">
          <h3 className="text-sm font-bold uppercase tracking-widest">{locale === 'en' ? 'Select a location on the map' : locale === 'zh' ? '在地图上选择一个位置' : 'เลือกตำแหน่งบนแผนที่'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 relative">{content}</div>
      </div>
    )
  }

  return content
}
