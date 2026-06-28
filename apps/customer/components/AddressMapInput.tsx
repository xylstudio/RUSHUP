'use client';
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from '@react-google-maps/api'
import { FiMapPin, FiSearch, FiTarget } from 'react-icons/fi'
import { useI18n } from "@/lib/I18nContext";

interface AddressMapInputProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  initialLocation?: { lat: number; lng: number }
  initialAddress?: string
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places']

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0',
}

const defaultCenter = {
  lat: 13.7563, // Bangkok
  lng: 100.5018,
}

export default function AddressMapInput({
  onLocationSelect,
  initialLocation,
  initialAddress,
}: AddressMapInputProps) {
    const { locale } = useI18n();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number }>(
    initialLocation || defaultCenter
  )
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    initialLocation || defaultCenter
  )
  const [address, setAddress] = useState(initialAddress || '')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (initialLocation) {
      setMarkerPosition(initialLocation)
      setMapCenter(initialLocation)
    }
  }, [initialLocation])

  const repaintMap = useCallback(() => {
    const map = mapRef.current

    if (!map || !window.google) return

    window.google.maps.event.trigger(map, 'resize')
    map.panTo(mapCenter)
  }, [mapCenter])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map

    if (window.google?.maps?.RenderingType?.RASTER) {
      map.setOptions({
        renderingType: window.google.maps.RenderingType.RASTER,
      })
    }

    window.requestAnimationFrame(() => {
      window.google?.maps?.event.trigger(map, 'resize')
      map.panTo(mapCenter)
    })
  }, [mapCenter])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(repaintMap)
    const firstTimeoutId = window.setTimeout(repaintMap, 250)
    const secondTimeoutId = window.setTimeout(repaintMap, 800)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(firstTimeoutId)
      window.clearTimeout(secondTimeoutId)
    }
  }, [repaintMap])

  useEffect(() => {
    if (!containerRef.current || !mapRef.current || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      repaintMap()
    })

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const newPos = { lat, lng }
        
        setMarkerPosition(newPos)
        setMapCenter(newPos)
        setAddress(place.formatted_address || '')
        onLocationSelect(lat, lng, place.formatted_address)
      }
    }
  }

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      const newPos = { lat, lng }
      
      setMarkerPosition(newPos)
      
      // Reverse Geocoding to get address from lat/lng
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const formattedAddress = results[0].formatted_address
          setAddress(formattedAddress)
          onLocationSelect(lat, lng, formattedAddress)
        } else {
          onLocationSelect(lat, lng)
        }
      })
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setMarkerPosition(newPos)
          setMapCenter(newPos)
          
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const formattedAddress = results[0].formatted_address
              setAddress(formattedAddress)
              onLocationSelect(newPos.lat, newPos.lng, formattedAddress)
            } else {
              onLocationSelect(newPos.lat, newPos.lng)
            }
          })
        },
        () => {
          alert('Error: The Geolocation service failed.')
        }
      )
    } else {
      alert('Error: Your browser doesn\'t support geolocation.')
    }
  }

  if (loadError) return <div>Error loading maps</div>
  if (!isLoaded) return <div className="h-[300px] bg-gray-100 flex items-center justify-center rounded-lg animate-pulse">Loading Maps...</div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder={locale === 'en' ? 'Search for place names or address...' : locale === 'zh' ? '搜索地名或地址...' : 'ค้นหาชื่อสถานที่ หรือที่อยู่...'}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-none shadow-sm focus:ring-black focus:border-black text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Autocomplete>
      </div>

      <div ref={containerRef} className="relative group">
        <GoogleMap
          mapContainerClassName="google-map-container"
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={15}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            mapTypeId: 'roadmap',
          }}
        >
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            icon={{
               path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
               fillColor: "#2563eb",
               fillOpacity: 1,
               strokeWeight: 2,
               strokeColor: "#ffffff",
               scale: 2,
               anchor: new google.maps.Point(12, 22),
            }}
          />
        </GoogleMap>
        
        <button
          type="button"
          onClick={getCurrentLocation}
          className="absolute bottom-4 right-4 bg-white p-3 rounded-none shadow-xl border border-[#E5E5DF] hover:bg-black hover:text-white text-[#1A1A18] active:scale-95 transition-all"
          title={locale === 'en' ? 'Current position' : locale === 'zh' ? '当前位置' : 'ตำแหน่งปัจจุบัน'}
        >
          <FiTarget size={20} />
        </button>
      </div>

      <div className="bg-[#FDFDFB] p-4 rounded-none flex items-start gap-3 border border-[#F0F0E8]">
        <FiMapPin className="text-[#1A1A18] mt-0.5 shrink-0" />
        <div className="text-[10px] text-[#1A1A18] uppercase font-black tracking-widest">
          <p className="mb-1">{locale === 'en' ? 'Current coordinates:' : locale === 'zh' ? '当前坐标：' : 'พิกัดปัจจุบัน:'}</p>
          <p className="text-xs">{markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</p>
          <p className="mt-2 text-[9px] opacity-40 normal-case font-normal">{locale === 'en' ? '* You can drag the pin on the map to pinpoint the exact location.' : locale === 'zh' ? '* 您可以拖动地图上的图钉来精确定位。' : '* คุณสามารถลากหมุดบนแผนที่เพื่อระบุตำแหน่งที่แน่นอนได้'}</p>
        </div>
      </div>
    </div>
  )
}
